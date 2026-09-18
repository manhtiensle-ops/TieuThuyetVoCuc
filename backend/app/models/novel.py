from sqlalchemy import String, Text, Float, Integer, Enum, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.session import Base

class Novel(Base):
    __tablename__ = "novels"

    id: Mapped[int]             = mapped_column(primary_key=True, index=True)
    slug: Mapped[str]           = mapped_column(String(200), unique=True, index=True, nullable=False)
    title: Mapped[str]          = mapped_column(String(300), nullable=False, index=True)
    author: Mapped[str]         = mapped_column(String(150), nullable=False, index=True)
    description: Mapped[str]    = mapped_column(Text, default="")
    cover_url: Mapped[str|None] = mapped_column(String(512))
    status: Mapped[str]         = mapped_column(
        Enum("ongoing", "completed", "hiatus", name="novel_status"),
        default="ongoing"
    )
    views: Mapped[int]          = mapped_column(default=0, index=True)
    rating: Mapped[float]       = mapped_column(Float, default=0.0)
    total_chapters: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime]= mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime]= mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    chapters: Mapped[list["Chapter"]] = relationship(back_populates="novel", lazy="dynamic", order_by="Chapter.number")
    genres: Mapped[list["NovelGenre"]] = relationship(back_populates="novel", cascade="all, delete-orphan")

class NovelGenre(Base):
    __tablename__ = "novel_genres"
    id: Mapped[int]       = mapped_column(primary_key=True)
    novel_id: Mapped[int] = mapped_column(ForeignKey("novels.id", ondelete="CASCADE"), index=True)
    genre: Mapped[str]    = mapped_column(String(50), nullable=False)
    novel: Mapped["Novel"] = relationship(back_populates="genres")