from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import TYPE_CHECKING
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User

class BlockedIP(Base):
    __tablename__ = "blocked_ips"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ip_address: Mapped[str] = mapped_column(String(45), unique=True, index=True, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    blocked_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    blocked_by: Mapped["User | None"] = relationship(foreign_keys=[blocked_by_id])
