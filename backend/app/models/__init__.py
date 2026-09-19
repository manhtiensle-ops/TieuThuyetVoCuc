from app.models.user import User
from app.models.novel import Novel, NovelGenre, NovelTag
from app.models.chapter import Chapter
from app.models.comment import Comment, CommentReaction
from app.models.reading_history import ReadingHistory
from app.models.report import Report
from app.models.blocked_ip import BlockedIP

__all__ = [
    "User",
    "Novel",
    "NovelGenre",
    "NovelTag",
    "Chapter",
    "Comment",
    "CommentReaction",
    "ReadingHistory",
    "Report",
    "BlockedIP",
]
