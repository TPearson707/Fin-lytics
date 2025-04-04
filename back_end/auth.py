from datetime import datetime, timedelta, UTC
from typing import Annotated
from fastapi import FastAPI, Depends, HTTPException, status, APIRouter
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette import status
from database import SessionLocal
from models import Users, Settings
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from email_service import send_email

router = APIRouter(
    prefix='/auth',
    tags=['auth']
)

# Configuration
SECRET_KEY = "hello"  # Key for JWT encoding (replace later)
ALGORITHM = "HS256"  # Algorithm for JWT encoding
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Access token duration

bcrypt = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_bearer = OAuth2PasswordBearer(tokenUrl="auth/token")

# Pydantic models
class CreateUserRequest(BaseModel):
    """Schema for user registration request."""
    first_name: str
    last_name: str
    email: str
    username: str
    phone_number: str
    password: str

class Token(BaseModel):
    """Schema for authentication token response."""
    access_token: str
    token_type: str

def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=Token)
async def create_user(db: db_dependency, create_user_request: CreateUserRequest):
    """Registers a new user with hashed password and sends a verification email."""
    existing_user = db.query(Users).filter(Users.username == create_user_request.username).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User with this username already exists")

    existing_number = db.query(Users).filter(Users.phone_number == create_user_request.phone_number).first()
    if existing_number:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User with this phone number already exists")

    verification_token = generate_verification_token(create_user_request.email)
    create_user_model = Users(
        first_name=create_user_request.first_name,
        last_name=create_user_request.last_name,
        email=create_user_request.email,
        username=create_user_request.username,
        phone_number=create_user_request.phone_number,
        hashed_password=bcrypt.hash(create_user_request.password),
        verification_token=verification_token
    )
    db.add(create_user_model)
    db.commit()

    verification_link = f"http://localhost:8000/auth/verify_email?token={verification_token}"
    email_content = f"Click the link to verify your email: {verification_link}"
    send_email(create_user_request.email, "Verify your email", email_content)

    user_settings = Settings(user_id=create_user_model.id, email_notifications=False, sms_notifications=False, push_notifications=False)
    db.add(user_settings)
    db.commit()

    token = create_access_token(create_user_model.username, create_user_model.id, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": token, "token_type": "bearer"}

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: db_dependency):
    """Authenticates a user and returns an access token if credentials are valid."""
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})

    token = create_access_token(user.username, user.id, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": token, "token_type": "bearer"}

def authenticate_user(username: str, password: str, db):
    """Verifies username and password against the database."""
    user = db.query(Users).filter(Users.username == username).first()
    if not user or not bcrypt.verify(password, user.hashed_password):
        return False
    return user

def create_access_token(username: str, user_id: int, expires_delta: timedelta):
    """Creates a JWT token with user details and expiration."""
    encode = {'sub': username, 'id': user_id, 'exp': datetime.utcnow() + expires_delta}
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: Annotated[str, Depends(oauth2_bearer)], db: db_dependency):
    """Retrieves the currently authenticated user from the token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username, user_id = payload.get('sub'), payload.get('id')
        if username is None or user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Could not validate user')
        user = db.query(Users).filter(Users.id == user_id).first()
        if not user or not user.is_verified:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")
        return {'first_name': user.first_name, 'last_name': user.last_name, 'username': user.username, 'id': user.id}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Could not validate user')

#Generates a verification token
def generate_verification_token(email: str) -> str:
    expires_delta = timedelta(hours=24)
    encode = {'sub': email, 'exp': datetime.now(UTC) + expires_delta}
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)

#Verifies the verification token
def verify_verification_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get('sub')
        if email is None:
            raise HTTPException(status_code=400, detail="Invalid token")
        return email
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid token")

#Endpoint to verify the email
@router.get("/verify_email")
async def verify_email(token: str, db: db_dependency):
    email = verify_verification_token(token)
    user = db.query(Users).filter(Users.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    user.is_verified = True
    user.verification_token = None
    db.commit()
    
    return "Email verified successfully"

def hashPassword(password: str):
    return bcrypt.hash(password);
