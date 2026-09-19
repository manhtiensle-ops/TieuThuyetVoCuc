from sqlalchemy import Text, Boolean, Integer, String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import TYPE_CHECKING
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.chapter import Chapter
    from app.models.user import User

class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int]             = mapped_column(primary_key=True, index=True)
    chapter_id: Mapped[int]     = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int]        = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    paragraph_index: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True)
    content: Mapped[str]        = mapped_column(Text, nullable=False)
    upvotes: Mapped[int]        = mapped_column(Integer, default=0)
    is_spoiler: Mapped[bool]    = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime]= mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime]= mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    chapter: Mapped["Chapter"]  = relationship(back_populates="comments")
    user: Mapped["User"]        = relationship(back_populates="comments")
    parent: Mapped["Comment | None"] = relationship("Comment", remote_side=[id], back_populates="replies")
    replies: Mapped[list["Comment"]] = relationship("Comment", back_populates="parent", cascade="all, delete-orphan")
    reactions: Mapped[list["CommentReaction"]] = relationship(back_populates="comment", cascade="all, delete-orphan")

class CommentReaction(Base):
    __tablename__ = "comment_reactions"
    __table_args__ = (
        UniqueConstraint("comment_id", "user_id", name="uq_user_comment_reaction"),
    )

    id: Mapped[int]             = mapped_column(primary_key=True, index=True)
    comment_id: Mapped[int]     = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int]        = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    reaction_type: Mapped[str]  = mapped_column(String(20), nullable=False)  # 'like', 'laugh', 'fire', 'shock'
    created_at: Mapped[datetime]= mapped_column(DateTime(timezone=True), server_default=func.now())

    comment: Mapped["Comment"]  = relationship(back_populates="reactions")
    user: Mapped["User"]        = relationship()
