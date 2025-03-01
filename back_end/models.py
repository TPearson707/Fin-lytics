from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class Users(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    phone_number = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    disabled = Column(Boolean, default=False)