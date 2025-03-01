from sqlalchemy.orm import Session
from models import Users
from database import SessionLocal

def print_database(db: Session):
    # Query all users from the database
    users = db.query(Users).all()

    # Print each user's details
    for user in users:
        print(f"ID: {user.id}, Email: {user.email}, Phone Number: {user.phone_number}, password: {user.hashed_password}, Disabled: {user.disabled}")

db = SessionLocal()  # Adjust this line according to database
try:
    print_database(db)
finally:
    db.close()  
