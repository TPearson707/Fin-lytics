from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# AWS RDS MySQL Database Configuration
DATABASE_USERNAME = "website_user"
DATABASE_PASSWORD = "iamthesiteuser"
DATABASE_HOST = "financesite.cdoka0swm67i.us-east-2.rds.amazonaws.com"
DATABASE_NAME = "database"

DATABASE_URL = f"mysql+pymysql://{DATABASE_USERNAME}:{DATABASE_PASSWORD}@{DATABASE_HOST}/{DATABASE_NAME}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
