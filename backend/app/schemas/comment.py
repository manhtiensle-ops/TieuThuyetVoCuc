from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class CommentAuthor(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    role: str

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=2, max_length=1000, description="Nội dung bình luận từ 2 đến 1000 ký tự")
    paragraph_index: Optional[int] = Field(None, ge=0, description="Vị trí đoạn văn trích dẫn (None nếu là bình luận chân chương)")
    parent_id: Optional[int] = Field(None, description="ID bình luận cha nếu là reply")
    is_spoiler: bool = Field(False, description="Đánh dấu tiết lộ nội dung")

class CommentReactionIn(BaseModel):
    reaction_type: str = Field(..., pattern="^(like|laugh|fire|shock)$", description="Loại cảm xúc: like, laugh, fire, shock")

class CommentReactionOut(BaseModel):
    comment_id: int
    user_id: int
    reaction_type: Optional[str] = None
    reactions_count: dict[str, int]

class CommentItem(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    chapter_id: int
    user_id: int
    paragraph_index: Optional[int] = None
    parent_id: Optional[int] = None
    content: str
    is_spoiler: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: CommentAuthor
    reactions_count: dict[str, int] = Field(default_factory=dict)
    my_reaction: Optional[str] = None
    replies_count: int = 0
    replies: list["CommentItem"] = Field(default_factory=list)

class CommentListOut(BaseModel):
    items: list[CommentItem]
    total: int
    page: int
    per_page: int
    pages: int

class CommentsSummaryOut(BaseModel):
    chapter_id: int
    total_comments: int
    chapter_comments_count: int
    paragraph_counts: dict[str, int]

# Backward compatibility alias
CommentOut = CommentItem
