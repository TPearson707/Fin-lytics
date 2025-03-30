from datetime import datetime, timedelta
from typing import Annotated
from fastapi import FastAPI, Depends, HTTPException, status, APIRouter
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from starlette import status
from database import SessionLocal
from models import Users, Settings
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt

router = APIRouter(
    prefix='/auth',
    tags=['auth']
)

# Configuration
SECRET_KEY = "hello" # Key for jwt encoding, Remember to replace later
ALGORITHM = "HS256"  # algorithm for jwt encoding
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # Access token duration

bcrypt = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_bearer = OAuth2PasswordBearer(tokenUrl="auth/token") # api endpoint for token

# Pydantic models
class CreateUserRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    username: str
    phone_number: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

def get_db():
    db = SessionLocal()
    try:                # Try to get db
        yield db
    finally:
        db.close()      # Regardless of success close db

db_dependency = Annotated[Session, Depends(get_db)]

# When a user registers, take their username and password
# hash password before storing for increased security
# The user gets added to the database, and account is created
@router.post("/", status_code=status.HTTP_201_CREATED, response_model=Token)
async def create_user(db: db_dependency, create_user_request: CreateUserRequest):
    # Check if the user already exists
    existing_user = db.query(Users).filter(Users.username == create_user_request.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username already exists",
        )

    # Check if the phone number already exists
    existing_number = db.query(Users).filter(Users.phone_number == create_user_request.phone_number).first()
    if existing_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this phone number already exists",
        )

    # Create the user if they don't exist
    create_user_model = Users(
        first_name=create_user_request.first_name,
        last_name=create_user_request.last_name,
        email=create_user_request.email,
        username=create_user_request.username,
        phone_number=create_user_request.phone_number,
        hashed_password=bcrypt.hash(create_user_request.password),
    )

    db.add(create_user_model)
    db.commit()

    # Create default settings for the user (with all notifications set to False)
    user_settings = Settings(
        user_id=create_user_model.id,
        email_notifications=False,
        sms_notifications=False,
        push_notifications=False,
    )
    db.add(user_settings)
    db.commit()

    # Generate token after creating user
    token = create_access_token(create_user_model.username, create_user_model.id, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

    return {"access_token": token, "token_type": "bearer"}


# Takes in users username and password
# Retrive the user from the database
# if the password is correct, generate a JWT token with expiration time (30 minutes)
# Token is returned to the user
@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
                                 db: db_dependency):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(user.username, user.id, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)) # after 30 minutes user will have to log in again

    return {'access_token': token, 'token_type': 'bearer'}

# Utility functions

# Look up user by username in the database
# Compare the hashed password in the database with the provided password
# if both match, return the user
def authenticate_user(username: str, password: str, db):
    user = db.query(Users).filter(Users.username == username).first()
    if not user:
        return False
    if not bcrypt.verify(password, user.hashed_password):
        return False
    return user

# JWT payload is created with: username (sub), user ID (id), expiration time (exp)
# Encode the payload using SECRET_KEY and ALGORITHM
def create_access_token(username: str, user_id: int, expires_delta: timedelta):
    encode = {'sub': username, 'id': user_id}
    expires = datetime.utcnow() + expires_delta
    encode.update({'exp': expires})
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: Annotated[str, Depends(oauth2_bearer)], db: db_dependency):
    try:
        # Decode the JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get('sub')
        user_id: int = payload.get('id')

        if username is None or user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Could not validate user')

        # Fetch user details from the database
        user = db.query(Users).filter(Users.id == user_id).first()
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Return the user details
        return {
            'first_name': user.first_name,
            'last_name': user.last_name,
            'username': user.username,
            'id': user.id
        }
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Could not validate user')


#Lilly: Trying to make endpoint to call for updating user info via account settings
class UpdateUserRequest(BaseModel):
    email: str
    phone_number: str
    password: str

@router.put("/update", status_code=status.HTTP_200_OK)
async def update_user(user: Annotated[dict, Depends(get_current_user)], 
                      db: db_dependency,
                      update_user_request: UpdateUserRequest):
        
        user_model = db.query(Users).filter(Users.id == user["id"]).first()
        if not user_model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                detail="User not found")

        if update_user_request.email:
            user_model.email = update_user_request.email
        if update_user_request.phone_number:
            user_model.phone_number = update_user_request.phone_number
        if update_user_request.password:
            user_model.hashed_password = bcrypt.hash(update_user_request.password) 

        db.commit()
        return{"message": "User updated successfully"}

