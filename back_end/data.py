from sqlalchemy.orm import Session
from database import engine
from models import Users

def print_all_users():
    with Session(engine) as session:
        users = session.query(Users).all()
        for user in users:
            print(f"ID: {user.id}, Username: {user.username}, Phone Number: {user.phone_number}, Hashed Password: {user.hashed_password} Disabled: {user.disabled}")

print_all_users()
