import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from cryptography.fernet import Fernet
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
from database import SessionLocal
from models import Users
from auth import get_current_user
from dotenv import load_dotenv
from models import Users, Plaid_Bank_Account, Plaid_Transactions
from datetime import datetime, timedelta
from datetime import date

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
        #print("Authenticated User:", user)  # Debugging

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



def fetch_and_store_accounts(user_id: int):
    """Background task to fetch Plaid accounts for this user and store them in Plaid_Bank_Account."""
    db = SessionLocal()
    try:
        # 1) Retrieve user & decrypt token
        db_user = db.query(Users).filter(Users.id == user_id).first()
        if not db_user or not db_user.plaid_access_token:
            return  # user or token missing

        decrypted_access_token = decrypt_token(db_user.plaid_access_token)

        # 2) Fetch accounts
        accounts_request = AccountsGetRequest(
            client_id=PLAID_CLIENT_ID,
            secret=PLAID_SECRET,
            access_token=decrypted_access_token
        )
        accounts_response = client.accounts_get(accounts_request)
        accounts_data = accounts_response.to_dict().get("accounts", [])

        # 3) Save accounts
        for acc in accounts_data:
            # Check if this account already exists
            existing_account = (
                db.query(Plaid_Bank_Account)
                .filter_by(account_id=acc["account_id"])
                .first()
            )
            if existing_account:
                # Optionally update balances, etc.
                existing_account.current_balance = acc["balances"].get("current")
                existing_account.available_balance = acc["balances"].get("available")
                existing_account.currency = acc["balances"].get("iso_currency_code")
                existing_account.name = acc["name"]
                existing_account.type = acc["type"]
                existing_account.subtype = acc.get("subtype")
            else:
                # Create a new bank account record
                new_account = Plaid_Bank_Account(
                    user_id=user_id,
                    account_id=acc["account_id"],
                    name=acc["name"],
                    type=acc["type"],
                    subtype=acc.get("subtype"),
                    current_balance=acc["balances"].get("current"),
                    available_balance=acc["balances"].get("available"),
                    currency=acc["balances"].get("iso_currency_code"),
                )
                db.add(new_account)
        db.commit()

        # 4) Now fetch transactions for these accounts
        #    You can fetch them in one call or multiple calls per account.
        fetch_and_store_transactions(db, decrypted_access_token)

    except Exception as e:
        print("Error fetching/storing accounts:", e)
    finally:
        db.close()

def fetch_and_store_transactions(db: Session, decrypted_access_token: str):
    """Fetch transactions for the last 30 days and store them in Plaid_Transactions."""
    try:
        # 1) Prepare date range
        end_date = datetime.now().date()
        start_date = (datetime.now() - timedelta(days=30)).date()

        # 2) Fetch transactions
        transactions_request = TransactionsGetRequest(
            client_id=PLAID_CLIENT_ID,
            secret=PLAID_SECRET,
            access_token=decrypted_access_token,
            start_date=start_date,
            end_date=end_date,
        )
        transactions_response = client.transactions_get(transactions_request)
        transactions_data = transactions_response.to_dict().get("transactions", [])

        # 3) Store each transaction
        for t in transactions_data:
            existing_tx = (
                db.query(Plaid_Transactions)
                .filter_by(transaction_id=t["transaction_id"])
                .first()
            )
            if existing_tx:
                continue  # or update if you prefer

            # If Plaid returns the date as a string, parse it:
            tx_date = (
                t["date"]
                if isinstance(t["date"], date)
                else datetime.strptime(t["date"], "%Y-%m-%d").date()
            )

            new_tx = Plaid_Transactions(
                transaction_id=t["transaction_id"],
                account_id=t["account_id"],  # references Plaid_Bank_Account.account_id
                amount=t["amount"],
                currency=t.get("iso_currency_code"),
                category=", ".join(t["category"]) if t.get("category") else None,
                merchant_name=t.get("merchant_name"),
                date=tx_date,
            )
            db.add(new_tx)
        db.commit()
    except Exception as e:
        print("Error importing transactions:", e)

@router.post("/exchange_public_token")
async def exchange_public_token(
    request: PublicTokenRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Exchange a public token for an access token, store it, and automatically import transactions."""
    try:
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

        # Schedule the transactions import as a background task
        background_tasks.add_task(fetch_and_store_accounts, user["id"])

        return {"message": "Plaid access token stored and transactions import scheduled"}
    except Exception as e:
        print(f"Plaid API Error: {str(e)}")
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


@router.delete("/unlink")
async def unlink_plaid(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Remove the stored Plaid token and delete all bank accounts and transaction data for the current user."""
    db_user = db.query(Users).filter(Users.id == user["id"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Clear the Plaid access token
    db_user.plaid_access_token = None

    # Delete all associated bank accounts (transactions will be deleted by cascade)
    # If the relationship in Users is defined with cascade="all, delete-orphan"
    # then you can simply clear the relationship:
    db_user.bank_accounts = []

    # Alternatively, if you prefer to delete explicitly:
    # for account in db_user.bank_accounts:
    #     db.delete(account)
    
    db.commit()
    
    return {"message": "Plaid access token and all associated bank accounts and transactions deleted. Please re-link your account."}