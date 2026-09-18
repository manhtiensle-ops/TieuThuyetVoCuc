from sqlalchemy import Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.session import Base

class ReadingHistory(Base):
    __tablename__ = "reading_history"

    id: Mapped[int]             = mapped_column(primary_key=True)
    user_id: Mapped[int]        = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    novel_id: Mapped[int]       = mapped_column(ForeignKey("novels.id", ondelete="CASCADE"), index=True)
    last_chapter: Mapped[int]   = mapped_column(Integer, default=1)
    read_at: Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"]        = relationship(back_populates="reading_history")