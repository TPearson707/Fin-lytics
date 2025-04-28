from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal
from models import Users, Plaid_Bank_Account
from auth import get_current_user
from plaid.api import plaid_api
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.accounts_balance_get_response import AccountsBalanceGetResponse
from plaid_routes import decrypt_token, PLAID_CLIENT_ID, PLAID_SECRET, client

router = APIRouter(
    prefix="/user_balances",
    tags=["User Balances"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", status_code=status.HTTP_200_OK)
async def get_user_balances(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)]
):
    """
    Fetch the user's Plaid credit/debit balances and cash balance.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication Failed")

    db_user = db.query(Users).filter(Users.id == user["id"]).first()
    if not db_user or not db_user.plaid_access_token:
        raise HTTPException(status_code=400, detail="Plaid account not linked")

    decrypted_access_token = decrypt_token(db_user.plaid_access_token)

    try:
        request = AccountsBalanceGetRequest(access_token=decrypted_access_token)
        response: AccountsBalanceGetResponse = client.accounts_balance_get(request)
        plaid_balances = [
            {
                "account_id": account.account_id,
                "name": account.name,
                "type": account.type,
                "subtype": account.subtype,
                "balance": account.balances.available,
            }
            for account in response.accounts
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching Plaid balances: {str(e)}")

    cash_balance = db_user.cash_balance if hasattr(db_user, "cash_balance") else 0.0

    return {
        "plaid_balances": plaid_balances,
        "cash_balance": cash_balance
    }