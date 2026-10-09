from sqlalchemy import Integer, Float, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import TYPE_CHECKING
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User


class ReadingHistory(Base):
    __tablename__ = "reading_history"
    __table_args__ = (
        # Mỗi user chỉ có 1 record per novel — upsert sẽ update thay vì insert mới
        UniqueConstraint("user_id", "novel_id", name="uq_reading_history_user_novel"),
    )

    id: Mapped[int]              = mapped_column(primary_key=True)
    user_id: Mapped[int]         = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    novel_id: Mapped[int]        = mapped_column(ForeignKey("novels.id", ondelete="CASCADE"), index=True)

    # Chương đang đọc dở
    last_chapter_id: Mapped[int | None]  = mapped_column(ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True)
    last_chapter_num: Mapped[int]        = mapped_column(Integer, default=1)

    # Vị trí scroll trong chương (0.0 → 1.0)
    scroll_pct: Mapped[float]    = mapped_column(Float, default=0.0)

    read_at: Mapped[datetime]    = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"]  = relationship(back_populates="reading_history")
