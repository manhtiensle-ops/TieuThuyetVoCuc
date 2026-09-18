from sqlalchemy import Text, Boolean, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.session import Base

class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int]             = mapped_column(primary_key=True, index=True)
    chapter_id: Mapped[int]     = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int]        = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[int|None] = mapped_column(ForeignKey("comments.id"), nullable=True)
    content: Mapped[str]        = mapped_column(Text, nullable=False)
    upvotes: Mapped[int]        = mapped_column(Integer, default=0)
    is_spoiler: Mapped[bool]    = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime]= mapped_column(DateTime(timezone=True), server_default=func.now())

    chapter: Mapped["Chapter"]  = relationship(back_populates="comments")
    user: Mapped["User"]        = relationship(back_populates="comments")
    replies: Mapped[list["Comment"]] = relationship("Comment", backref="parent", remote_side=[id])