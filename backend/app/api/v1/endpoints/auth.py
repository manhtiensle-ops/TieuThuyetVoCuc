from fastapi import APIRouter, Depends, HTTPException, Request, Response, Cookie, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, UserMeOut, TokenOut
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.deps import get_current_user
from app.core.ip_ban import get_client_ip
from app.core.token_blacklist import blacklist_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import time

_bearer = HTTPBearer(auto_error=False)

# Dùng get_client_ip để rate limit theo IP thực (sau proxy)
limiter = Limiter(key_func=get_client_ip)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=201)
@limiter.limit("10/minute")
async def register(request: Request, body: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    # Check duplicate
    existing = await db.execute(select(User).where((User.email == body.email) | (User.username == body.username)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email hoặc username đã tồn tại")

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        display_name=body.username,
    )
    db.add(user)
    await db.flush()

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=True, samesite="lax", max_age=60*60*24*30)
    return TokenOut(access_token=access_token)


@router.post("/login", response_model=TokenOut)
@limiter.limit("5/minute")
async def login(request: Request, body: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    # Trả lỗi chung để tránh user enumeration
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản bị khóa")
    if user.is_banned:
        raise HTTPException(status_code=403, detail="Tài khoản bị khóa")

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=True, samesite="lax", max_age=60*60*24*30)
    return TokenOut(access_token=access_token)


@router.post("/refresh", response_model=TokenOut)
async def refresh(
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Không có refresh token")

    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

    # [FIX] Query DB để xác nhận user vẫn active và chưa bị ban
    # Tránh trường hợp: Admin ban user → user dùng refresh token cũ bypass ban
    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản bị vô hiệu hóa")
    if user.is_banned:
        raise HTTPException(status_code=403, detail="Tài khoản bị khóa")

    new_access = create_access_token(user_id)
    return TokenOut(access_token=new_access)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
):
    # [FIX] Blacklist access token hiện tại để ngăn dùng lại sau logout
    if credentials and credentials.credentials:
        token = credentials.credentials
        try:
            payload = decode_token(token)
            jti = payload.get("jti")
            exp = payload.get("exp", 0)
            ttl = max(0, int(exp - time.time()))
            await blacklist_token(token, jti, ttl)
        except Exception:
            pass  # Token đã invalid thì không cần blacklist

    # Xóa cả refresh_token cookie
    response.delete_cookie("refresh_token", httponly=True, samesite="lax")
    return {"message": "Đã đăng xuất"}


@router.get("/me", response_model=UserMeOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
