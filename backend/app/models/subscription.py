from sqlalchemy import (
    Integer, String, Numeric, DateTime, ForeignKey,
    Enum as SAEnum, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import TYPE_CHECKING
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User

class SubscriptionOrder(Base):
    """Đơn hàng đăng ký VIP — lưu lịch sử thanh toán."""
    __tablename__ = "subscription_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Gói: "1m" = 1 tháng, "3m" = 3 tháng, "1y" = 1 năm
    plan: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # VND

    # pending → paid → active / failed / refunded
    status: Mapped[str] = mapped_column(
        SAEnum("pending", "paid", "failed", "refunded", name="order_status"),
        nullable=False,
        server_default="pending",
    )

    # Mã giao dịch từ payment gateway (VNPay TxnRef)
    txn_ref: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    gateway_response: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Thời hạn VIP được cấp bởi đơn này
    vip_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="subscription_orders")
