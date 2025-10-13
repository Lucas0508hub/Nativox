from sqlalchemy import Column, String, DateTime, Text, Index
from ..core.database import Base


class Session(Base):
    __tablename__ = "sessions"

    sid = Column(String, primary_key=True)
    sess = Column(Text, nullable=False)  # JSON data
    expire = Column(DateTime, nullable=False)

    __table_args__ = (
        Index('IDX_session_expire', 'expire'),
    )
