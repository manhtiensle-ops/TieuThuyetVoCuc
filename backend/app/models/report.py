from sqlalchemy import String, Text, DateTime, ForeignKey, func, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import TYPE_CHECKING
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.novel import Novel
    from app.models.user import User

class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    novel_id: Mapped[int] = mapped_column(ForeignKey("novels.id", ondelete="CASCADE"), index=True)
    reporter_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    reporter_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    reason: Mapped[str] = mapped_column(String(100), nullable=False)  # copyright, inappropriate, violent, spam, other
    details: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("pending", "resolved", "dismissed", name="report_status"),
        default="pending",
        index=True
    )
    admin_action: Mapped[str | None] = mapped_column(String(100), nullable=True)  # deleted_novel, banned_user, blocked_ip, dismissed
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    novel: Mapped["Novel"] = relationship(back_populates="reports")
    reporter: Mapped["User | None"] = relationship(foreign_keys=[reporter_id])
    resolved_by: Mapped["User | None"] = relationship(foreign_keys=[resolved_by_id])
