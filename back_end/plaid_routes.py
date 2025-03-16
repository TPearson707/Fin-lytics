from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from auth import get_current_user
from database import SessionLocal
from models import Users
from cryptography.fernet import Fernet
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
from plaid.model.transactions_get_request import TransactionsGetRequest
from datetime import datetime, timedelta
from pydantic import BaseModel  # Import BaseModel here

#  Add the APIRouter instance
router = APIRouter()

# Plaid Credentials
PLAID_CLIENT_ID = "67c88dfbd3c90700263d0608"
PLAID_SECRET = "5f8f736db858c8c45ca9ad990f21e3"
PLAID_ENVIRONMENT = "sandbox"

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

# Token encryption & decryption
ENCRYPTION_KEY = Fernet.generate_key()
cipher_suite = Fernet(ENCRYPTION_KEY)

def encrypt_token(token: str) -> str:
    return cipher_suite.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    return cipher_suite.decrypt(encrypted_token.encode()).decode()

# Pydantic Model for Public Token Request
class PublicTokenRequest(BaseModel):
    public_token: str

@router.post("/create_link_token")
async def create_link_token(user: dict = Depends(get_current_user)):
    """ Generate a Plaid link token for the frontend. """
    try:
        print("Authenticated User:", user)  # Debugging

        request_data = {
            "client_id": PLAID_CLIENT_ID,  # Ensure this is included
            "secret": PLAID_SECRET,  # Ensure this is included
            "user": {"client_user_id": str(user["id"])},
            "client_name": "MyApp",
            "products": [Products("auth"), Products("transactions")],
            "country_codes": [CountryCode("US")],
            "language": "en",
        }

        #print("Plaid Request Data:", request_data)  # Debugging

        request = LinkTokenCreateRequest(**request_data)
        response = client.link_token_create(request)

        #print("Plaid Response:", response)  # Debugging

        return response.to_dict()
    except Exception as e:
        #print(f"Plaid API Error: {str(e)}")  # Debugging
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/exchange_public_token")
async def exchange_public_token(
    request: PublicTokenRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """ Exchange a public token for an access token and store it securely. """
    try:
        print("Received Public Token:", request.public_token)  # Debugging log

        # Ensure client_id and secret are included in the request
        exchange_request = ItemPublicTokenExchangeRequest(
            client_id=PLAID_CLIENT_ID,
            secret=PLAID_SECRET,
            public_token=request.public_token
        )
        exchange_response = client.item_public_token_exchange(exchange_request)

        access_token = exchange_response["access_token"]

        #print("Received Access Token:", access_token)  # Debugging log

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
        print(f"Plaid API Error: {str(e)}")  # Debugging log
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/accounts")
async def get_accounts(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
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

        response = client.Transactions.get(decrypted_access_token, start_date=start_date, end_date=end_date)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
