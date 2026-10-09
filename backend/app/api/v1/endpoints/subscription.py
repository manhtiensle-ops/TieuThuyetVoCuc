"""
subscription.py — VIP Subscription Flow

Endpoints:
  POST /subscription/create-order   — Tạo đơn hàng, trả về payment URL (VNPay mock)
  POST /subscription/webhook/vnpay  — Nhận webhook từ VNPay, verify HMAC, nâng role VIP
  GET  /subscription/status         — Xem trạng thái VIP hiện tại của user
  GET  /subscription/orders         — Lịch sử đơn hàng của user

Security:
  - Webhook verify HMAC-SHA512 với VNPay secret key
  - Idempotent: cùng txn_ref không process 2 lần
  - VIP expires_at được extend (không reset) nếu gia hạn trước khi hết hạn
"""

import hashlib
import hmac
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.api.v1.endpoints.auth import limiter
from app.models.subscription import SubscriptionOrder
from app.models.user import User

router = APIRouter(prefix="/subscription", tags=["subscription"])

# ── Cấu hình gói VIP ────────────────────────────────────────
PLANS: dict[str, dict] = {
    "1m": {"label": "1 tháng",  "days": 30,  "amount": 29_000},
    "3m": {"label": "3 tháng",  "days": 90,  "amount": 79_000},
    "1y": {"label": "1 năm",    "days": 365, "amount": 249_000},
}

# VNPay config — load từ env (không hardcode secret)
import os
VNPAY_TMN_CODE    = os.getenv("VNPAY_TMN_CODE", "TESTCODE")
VNPAY_HASH_SECRET = os.getenv("VNPAY_HASH_SECRET", "")   # PHẢI set trong .env thật
VNPAY_URL         = os.getenv("VNPAY_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html")
FRONTEND_RETURN   = os.getenv("FRONTEND_URL", "http://localhost:5173") + "/subscription/result"


# ── Schemas ──────────────────────────────────────────────────
class CreateOrderRequest(BaseModel):
    plan: str = Field(..., description="Gói: 1m | 3m | 1y")
    client_ip: str = Field(default="127.0.0.1")  # sẽ bị override bởi server


class OrderResponse(BaseModel):
    txn_ref: str
    plan: str
    amount: int
    payment_url: str
    expires_minutes: int = 15

class SubscriptionStatus(BaseModel):
    role: str
    is_vip: bool
    vip_expires_at: datetime | None
    days_left: int | None


# ── Helpers ──────────────────────────────────────────────────
def _vnpay_sign(params: dict[str, str], secret: str) -> str:
    """HMAC-SHA512 theo chuẩn VNPay: sort key, urlencode, ký."""
    sorted_params = sorted(params.items())
    query = urlencode(sorted_params)
    return hmac.new(
        secret.encode("utf-8"),
        query.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()  # type: ignore[attr-defined]

def _build_vnpay_url(txn_ref: str, amount: int, plan: str, client_ip: str) -> str:
    """Tạo URL thanh toán VNPay."""
    now = datetime.now(timezone.utc)
    params = {
        "vnp_Version":     "2.1.0",
        "vnp_Command":     "pay",
        "vnp_TmnCode":     VNPAY_TMN_CODE,
        "vnp_Amount":      str(amount * 100),   # VNPay: đơn vị = đồng x100
        "vnp_CurrCode":    "VND",
        "vnp_TxnRef":      txn_ref,
        "vnp_OrderInfo":   f"VIP {plan} novel-platform",
        "vnp_OrderType":   "other",
        "vnp_Locale":      "vn",
        "vnp_ReturnUrl":   FRONTEND_RETURN,
        "vnp_IpAddr":      client_ip[:45],      # IPv4/IPv6 max 45 chars
        "vnp_CreateDate":  now.strftime("%Y%m%d%H%M%S"),
        "vnp_ExpireDate":  (now + timedelta(minutes=15)).strftime("%Y%m%d%H%M%S"),
    }
    if VNPAY_HASH_SECRET:
        params["vnp_SecureHash"] = _vnpay_sign(params, VNPAY_HASH_SECRET)
    return VNPAY_URL + "?" + urlencode(sorted(params.items()))

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ── Endpoints ────────────────────────────────────────────────
@router.post("/create-order", response_model=OrderResponse, status_code=201)
async def create_order(
    body: CreateOrderRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tạo đơn hàng VIP và trả về URL thanh toán VNPay."""
    # BUG FIX: Luôn lấy IP từ request thật, không tin client
    real_ip = (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or (request.client.host if request.client else None)
        or "127.0.0.1"
    )[:45]
    if body.plan not in PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gói không hợp lệ. Chọn một trong: {', '.join(PLANS)}",
        )

    plan_info = PLANS[body.plan]
    txn_ref = f"NP{uuid.uuid4().hex[:16].upper()}"

    order = SubscriptionOrder(
        user_id      = current_user.id,
        plan         = body.plan,
        amount       = plan_info["amount"],
        status       = "pending",
        txn_ref      = txn_ref,
        vip_expires_at = None,  # sẽ set khi webhook paid
    )
    db.add(order)
    await db.commit()

    payment_url = _build_vnpay_url(
        txn_ref   = txn_ref,
        amount    = plan_info["amount"],
        plan      = plan_info["label"],
        client_ip = real_ip,
    )

    return OrderResponse(
        txn_ref      = txn_ref,
        plan         = body.plan,
        amount       = plan_info["amount"],
        payment_url  = payment_url,
    )


@router.post("/webhook/vnpay", status_code=200)
@limiter.limit("30/minute")   # chống brute-force txn_ref
async def vnpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook từ VNPay server — verify HMAC, cập nhật đơn hàng, nâng VIP.
    Idempotent: nếu txn_ref đã paid thì bỏ qua.
    """
    params = dict(await request.form())

    # 1. Lấy secure hash từ payload
    received_hash = params.pop("vnp_SecureHash", "")
    params.pop("vnp_SecureHashType", None)

    # 2. Verify HMAC nếu có secret (bắt buộc ở production)
    if VNPAY_HASH_SECRET:
        expected = _vnpay_sign(
            {k: v for k, v in params.items() if k.startswith("vnp_")},
            VNPAY_HASH_SECRET,
        )
        if not hmac.compare_digest(expected, received_hash):
            raise HTTPException(status_code=400, detail="Invalid signature")

    txn_ref     = params.get("vnp_TxnRef", "")
    response_code = params.get("vnp_ResponseCode", "")
    vnpay_amount  = int(params.get("vnp_Amount", 0)) // 100  # đổi lại đơn vị

    # 3. Tìm order
    order = (await db.execute(
        select(SubscriptionOrder).where(SubscriptionOrder.txn_ref == txn_ref)
    )).scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # 4. Idempotent guard
    if order.status == "paid":
        return {"RspCode": "00", "Message": "Already processed"}

    # 5. Thanh toán thất bại
    if response_code != "00":
        order.status = "failed"
        order.gateway_response = str(params)[:512]
        await db.commit()
        return {"RspCode": response_code, "Message": "Payment failed"}

    # 6. Verify amount khớp với order
    if vnpay_amount != order.amount:
        order.status = "failed"
        await db.commit()
        raise HTTPException(status_code=400, detail="Amount mismatch")

    # 7. Nâng VIP — extend nếu user đang còn hạn, không reset
    plan_days = PLANS[order.plan]["days"]
    user = (await db.execute(
        select(User).where(User.id == order.user_id)
    )).scalar_one()

    base = max(user.vip_expires_at or _now_utc(), _now_utc())
    new_expires = base + timedelta(days=plan_days)

    user.role           = "vip"
    user.vip_expires_at = new_expires

    order.status        = "paid"
    order.paid_at       = _now_utc()
    order.vip_expires_at = new_expires
    order.gateway_response = str(params)[:512]

    await db.commit()
    return {"RspCode": "00", "Message": "Success"}


@router.get("/status", response_model=SubscriptionStatus)
async def get_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Xem trạng thái VIP hiện tại — tự động downgrade nếu hết hạn."""
    now = _now_utc()

    # Kiểm tra expiry + auto-downgrade
    if (
        current_user.role == "vip"
        and current_user.vip_expires_at
        and current_user.vip_expires_at < now
    ):
        current_user.role = "reader"
        await db.commit()
        await db.refresh(current_user)

    is_vip = current_user.role == "vip"
    days_left = None
    if is_vip and current_user.vip_expires_at:
        delta = current_user.vip_expires_at - now
        days_left = max(0, delta.days)

    return SubscriptionStatus(
        role           = current_user.role,
        is_vip         = is_vip,
        vip_expires_at = current_user.vip_expires_at,
        days_left      = days_left,
    )


@router.get("/orders")
async def list_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lịch sử đơn hàng của user (10 đơn gần nhất)."""
    orders = (await db.execute(
        select(SubscriptionOrder)
        .where(SubscriptionOrder.user_id == current_user.id)
        .order_by(SubscriptionOrder.created_at.desc())
        .limit(10)
    )).scalars().all()

    return [
        {
            "txn_ref":       o.txn_ref,
            "plan":          o.plan,
            "amount":        o.amount,
            "status":        o.status,
            "vip_expires_at": o.vip_expires_at,
            "created_at":    o.created_at,
            "paid_at":       o.paid_at,
        }
        for o in orders
    ]
