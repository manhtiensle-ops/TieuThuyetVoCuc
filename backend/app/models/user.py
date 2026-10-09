from sqlalchemy import String, Enum, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import TYPE_CHECKING
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.comment import Comment
    from app.models.reading_history import ReadingHistory
    from app.models.novel import Novel
    from app.models.subscription import SubscriptionOrder

class User(Base):
    __tablename__ = "users"

    id: Mapped[int]             = mapped_column(primary_key=True, index=True)
    username: Mapped[str]       = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str]          = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str]= mapped_column(String(128), nullable=False)
    display_name: Mapped[str]   = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512))
    bio: Mapped[str | None]     = mapped_column(Text)
    role: Mapped[str]           = mapped_column(
        Enum("admin", "editor", "vip", "reader", name="user_role"),
        default="reader", nullable=False
    )
    is_active: Mapped[bool]     = mapped_column(default=True)
    is_banned: Mapped[bool]     = mapped_column(default=False, nullable=False)
    ban_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_verified: Mapped[bool]   = mapped_column(default=False)
    created_at: Mapped[datetime]= mapped_column(DateTime(timezone=True), server_default=func.now())
    vip_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    comments: Mapped[list["Comment"]] = relationship(back_populates="user", lazy="dynamic")
    reading_history: Mapped[list["ReadingHistory"]] = relationship(back_populates="user", lazy="dynamic")
    novels: Mapped[list["Novel"]] = relationship(back_populates="uploader", lazy="dynamic")
    subscription_orders: Mapped[list["SubscriptionOrder"]] = relationship(back_populates="user", lazy="dynamic")
