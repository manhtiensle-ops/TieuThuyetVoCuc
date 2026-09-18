from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.session import Base

class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int]             = mapped_column(primary_key=True, index=True)
    novel_id: Mapped[int]       = mapped_column(ForeignKey("novels.id", ondelete="CASCADE"), index=True)
    number: Mapped[int]         = mapped_column(Integer, nullable=False, index=True)
    title: Mapped[str]          = mapped_column(String(300), nullable=False)
    content: Mapped[str]        = mapped_column(Text, nullable=False)
    word_count: Mapped[int]     = mapped_column(default=0)
    is_premium: Mapped[bool]    = mapped_column(Boolean, default=False)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    novel: Mapped["Novel"]      = relationship(back_populates="chapters")
    comments: Mapped[list["Comment"]] = relationship(back_populates="chapter", lazy="dynamic")