from datetime import datetime, timedelta
from typing import Annotated
from fastapi import FastAPI, Depends, HTTPException, status, APIRouter
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette import status
from database import SessionLocal
from models import Users
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
            detail="User with this email already exists",
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
        email=create_user_request.email,
        username=create_user_request.username,
        phone_number=create_user_request.phone_number,
        hashed_password=bcrypt.hash(create_user_request.password),
    )
    
    db.add(create_user_model)
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

# Decode the token using SECRET_KEY and extract user details
# If toke is invalid or expired, error that jawn
# If valid, return user details
async def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get('sub')
        user_id: int = payload.get('id')
        if username is None or user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, 
                                detail='Could not validate user')
        return {'username': username, 'id': user_id}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='Could not validate user')
    


