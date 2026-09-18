from pydantic import BaseModel
from datetime import datetime
from app.schemas.user import UserOut

class CommentCreate(BaseModel):
    content: str
    is_spoiler: bool = False

class CommentOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    chapter_id: int
    user: UserOut
    content: str
    upvotes: int
    is_spoiler: bool
    created_at: datetime