from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from auth import get_current_user  # Import user authentication function
from database import SessionLocal
from models import Users
from cryptography.fernet import Fernet
from plaid import Client
from pydantic import BaseModel
from datetime import datetime, timedelta

# Plaid Credentials
PLAID_CLIENT_ID = "your_plaid_client_id"
PLAID_SECRET = "your_plaid_secret"
PLAID_ENVIRONMENT = "sandbox"

# Initialize Plaid client
client = Client(
    client_id=PLAID_CLIENT_ID,
    secret=PLAID_SECRET,
    environment=PLAID_ENVIRONMENT,
)

# Encryption Key (Store this securely in production!)
ENCRYPTION_KEY = Fernet.generate_key()
cipher_suite = Fernet(ENCRYPTION_KEY)

# Dependency for Database Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Token encryption & decryption
def encrypt_token(token: str) -> str:
    return cipher_suite.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    return cipher_suite.decrypt(encrypted_token.encode()).decode()

# Pydantic Model for Public Token Request
class PublicTokenRequest(BaseModel):
    public_token: str

app = FastAPI()

@app.post("/exchange_public_token")
async def exchange_public_token(
    request: PublicTokenRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)  # Get the logged-in user
):
    """ Exchange a public token for an access token and store it securely for the logged-in user. """
    try:
        response = client.Item.public_token.exchange(request.public_token)
        access_token = response["access_token"]

        # Encrypt before storing
        encrypted_access_token = encrypt_token(access_token)

        # Find the user and store the encrypted Plaid token
        db_user = db.query(Users).filter(Users.id == user["id"]).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        db_user.plaid_access_token = encrypted_access_token
        db.commit()

        return {"message": "Plaid access token stored securely"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/accounts")
async def get_accounts(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)  # Only allow logged-in users
):
    """ Retrieve bank accounts securely for the logged-in user. """
    try:
        db_user = db.query(Users).filter(Users.id == user["id"]).first()
        if not db_user or not db_user.plaid_access_token:
            raise HTTPException(status_code=400, detail="No Plaid account linked")

        # Decrypt the stored Plaid token
        decrypted_access_token = decrypt_token(db_user.plaid_access_token)

        response = client.Accounts.get(decrypted_access_token)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/transactions")
async def get_transactions(
    start_date: str = Query((datetime.today() - timedelta(days=30)).strftime('%Y-%m-%d')),
    end_date: str = Query(datetime.today().strftime('%Y-%m-%d')),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)  # Only allow logged-in users
):
    """Retrieve transactions securely for the logged-in user."""
    try:
        db_user = db.query(Users).filter(Users.id == user["id"]).first()
        if not db_user or not db_user.plaid_access_token:
            raise HTTPException(status_code=400, detail="No Plaid account linked")

        # Decrypt the stored Plaid token
        decrypted_access_token = decrypt_token(db_user.plaid_access_token)

        response = client.Transactions.get(decrypted_access_token, start_date=start_date, end_date=end_date)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

