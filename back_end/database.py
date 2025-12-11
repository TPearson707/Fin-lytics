from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

# Database URL should be set in .env file as DATABASE_URL
# Example: DATABASE_URL=mysql+pymysql://username:password@host/database_name
engine = create_engine(os.getenv("DATABASE_URL"), pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
