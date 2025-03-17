import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from cryptography.fernet import Fernet
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
from database import SessionLocal
from models import Users
from auth import get_current_user
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

router = APIRouter()

# Plaid Credentials from environment variables
PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")
PLAID_ENVIRONMENT = os.getenv("PLAID_ENVIRONMENT", "sandbox")  # default to sandbox if not set

if not all([PLAID_CLIENT_ID, PLAID_SECRET]):
    raise Exception("Plaid credentials are not fully set in the environment variables.")

configuration = Configuration(
    host=f"https://{PLAID_ENVIRONMENT}.plaid.com"
)
api_client = ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

# Dependency for Database Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Token encryption & decryption using a fixed key from .env
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise Exception("ENCRYPTION_KEY not set in environment variables")
cipher_suite = Fernet(ENCRYPTION_KEY.encode())

def encrypt_token(token: str) -> str:
    return cipher_suite.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    return cipher_suite.decrypt(encrypted_token.encode()).decode()

# Pydantic Model for Public Token Request
class PublicTokenRequest(BaseModel):
    public_token: str

@router.post("/create_link_token")
async def create_link_token(user: dict = Depends(get_current_user)):
    """Generate a Plaid link token for the frontend."""
    try:
        print("Authenticated User:", user)  # Debugging

        request_data = {
            "client_id": PLAID_CLIENT_ID,
            "secret": PLAID_SECRET,
            "user": {"client_user_id": str(user["id"])},
            "client_name": "MyApp",
            "products": [Products("auth"), Products("transactions")],
            "country_codes": [CountryCode("US")],
            "language": "en",
        }

        request = LinkTokenCreateRequest(**request_data)
        response = client.link_token_create(request)
        return response.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exchange_public_token")
async def exchange_public_token(
    request: PublicTokenRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Exchange a public token for an access token and store it securely."""
    try:
        print("Received Public Token:", request.public_token)  # Debug log

        exchange_request = ItemPublicTokenExchangeRequest(
            client_id=PLAID_CLIENT_ID,
            secret=PLAID_SECRET,
            public_token=request.public_token
        )
        exchange_response = client.item_public_token_exchange(exchange_request)
        access_token = exchange_response["access_token"]

        # Encrypt before storing
        encrypted_access_token = encrypt_token(access_token)

        # Store the encrypted access token in the database
        db_user = db.query(Users).filter(Users.id == user["id"]).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        db_user.plaid_access_token = encrypted_access_token
        db.commit()

        return {"message": "Plaid access token stored securely"}
    except Exception as e:
        print(f"Plaid API Error: {str(e)}")  # Debug log
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/accounts")
async def get_accounts(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    try:
        db_user = db.query(Users).filter(Users.id == user["id"]).first()
        if not db_user or not db_user.plaid_access_token:
            raise HTTPException(status_code=400, detail="No Plaid account linked")

        # Decrypt the stored Plaid token
        decrypted_access_token = decrypt_token(db_user.plaid_access_token)
        #print(f"Decrypted token: {decrypted_access_token}")

        # Create a request object including client_id and secret
        request_obj = AccountsGetRequest(
            client_id=PLAID_CLIENT_ID,
            secret=PLAID_SECRET,
            access_token=decrypted_access_token
        )
        #print(f"Plaid Request: {request_obj}")

        # Call the accounts_get endpoint on the client
        response = client.accounts_get(request_obj)
        #print(f"Plaid Response: {response}")

        return response.to_dict()
    except Exception as e:
        #print("Error in /accounts:", repr(e))
        #if hasattr(e, "body"):
            #print("Error body:", e.body)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions")
async def get_transactions(
    start_date: str = Query((datetime.today() - timedelta(days=30)).strftime('%Y-%m-%d')),
    end_date: str = Query(datetime.today().strftime('%Y-%m-%d')),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Retrieve transactions securely for the logged-in user."""
    try:
        db_user = db.query(Users).filter(Users.id == user["id"]).first()
        if not db_user or not db_user.plaid_access_token:
            raise HTTPException(status_code=400, detail="No Plaid account linked")

        # Decrypt the stored Plaid token
        decrypted_access_token = decrypt_token(db_user.plaid_access_token)
        
        # Import the TransactionsGetRequest model
        from plaid.model.transactions_get_request import TransactionsGetRequest
        
        # Create the request object including client_id and secret
        request_obj = TransactionsGetRequest(
            client_id=PLAID_CLIENT_ID,
            secret=PLAID_SECRET,
            access_token=decrypted_access_token,
            start_date=start_date,
            end_date=end_date
        )
        
        # Call the transactions_get endpoint on the client and return its response as a dictionary
        response = client.transactions_get(request_obj)
        return response.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.delete("/unlink")
async def unlink_plaid(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Remove the stored Plaid token for the current user."""
    db_user = db.query(Users).filter(Users.id == user["id"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Clear the Plaid access token
    db_user.plaid_access_token = None
    db.commit()
    
    return {"message": "Plaid access token deleted. Please re-link your account."}
