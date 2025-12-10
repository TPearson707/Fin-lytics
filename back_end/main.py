from fastapi import FastAPI, status, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import models

# Load environment variables at startup
load_dotenv()
import plaid_routes
from database import engine, SessionLocal
from typing import Annotated
from sqlalchemy.orm import Session
import auth
from auth import get_current_user
import user_info
import user_settings
import user_categories
import stock_routes
import overview_routes
import pie_chart
import user_balances
import user_transactions
import entered_transactions
import balance_routes
import budget_goals
import stripe_routes
from startup import initialize_prediction_service, cleanup_prediction_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize prediction service in background (non-blocking)
    # This runs in a separate thread so it doesn't block server startup
    initialize_prediction_service()
    yield
    # Shutdown: Cleanup
    cleanup_prediction_service()

app = FastAPI(lifespan=lifespan)

origins = [
    "https://localhost:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(plaid_routes.router)  # Include Plaid API routes
app.include_router(user_info.router)
app.include_router(user_settings.router)
app.include_router(user_categories.router)
app.include_router(stock_routes.router)
app.include_router(overview_routes.router)
app.include_router(pie_chart.router)
app.include_router(user_balances.router)
app.include_router(user_transactions.router)
app.include_router(entered_transactions.router)
app.include_router(balance_routes.router)
app.include_router(budget_goals.router)
app.include_router(stripe_routes.router)


# Create MySQL tables (make sure this is called at least once)
models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

# A user must send a valid token to access the route
# If token is valid, the user info is returned
# Otherwise, authentication fails
@app.get("/", status_code=status.HTTP_200_OK)
async def user(user: user_dependency, db: db_dependency):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    return {"User": user}

# Big Picture of Auth
# User registers -> Password is hashed and stored
# User logs in -> if password is correct, they receive a JWT token
# User send token in requests -> Token is decoded to verify identity
# Protected routes require tokens -> Unauthorized users get errored on
