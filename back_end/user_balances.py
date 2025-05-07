from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal
from models import Users, Plaid_Bank_Account
from auth import get_current_user
from plaid.api import plaid_api
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
# from plaid.model.accounts_balance_get_response import AccountsBalanceGetResponse 
# # Uncomment if needed, this gave me an error when trying to run, removed for now
from plaid_routes import decrypt_token, PLAID_CLIENT_ID, PLAID_SECRET, client

# from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

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
    try:
        print("User received:", user)  # debug: Print the user object
        db_user = db.query(Users).filter(Users.id == user["id"]).first()
        print("Database user:", db_user)  # debug: Print the database user

        if not db_user or not db_user.plaid_access_token:
            print("Plaid account not linked or user not found")  # debug
            raise HTTPException(status_code=400, detail="Plaid account not linked")

        decrypted_access_token = decrypt_token(db_user.plaid_access_token)
        print("Decrypted access token:", decrypted_access_token)  # debug

        # Include client_id and secret in the request
        request = AccountsBalanceGetRequest(
            access_token=decrypted_access_token,
            client_id=PLAID_CLIENT_ID,
            secret=PLAID_SECRET
        )
        response = client.accounts_balance_get(request).to_dict()  # Convert to dict
        print("Plaid response:", response)  # debug

        # ensure plaid_balances is JSON serializable
        plaid_balances = [
            {
                "account_id": account["account_id"],
                "name": account["name"],
                "type": account["type"],
                "subtype": account["subtype"],
                "balance": account["balances"]["available"],
            }
            for account in response["accounts"]
        ]
        print("Plaid balances:", plaid_balances)  # debug

        # Ensure cash_balance is a primitive type
        cash_balance = float(db_user.cash_balance) if hasattr(db_user, "cash_balance") else 0.0
        print(f"Returning cash balance for user {user['id']}: {cash_balance}")  # debugging

        # Use jsonable_encoder to ensure the response is JSON serializable
        from fastapi.encoders import jsonable_encoder
        return jsonable_encoder({"plaid_balances": plaid_balances, "cash_balance": cash_balance})
    except Exception as e:
        print("Error in /user_balances/ endpoint:", str(e))  # debug
        raise HTTPException(status_code=500, detail="Internal Server Error")



class CashBalanceUpdate(BaseModel):
    cash_balance: float

@router.post("/update_cash_balance/")
async def update_cash_balance(
    update_data: CashBalanceUpdate,
    user: Annotated[dict, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    db_user = db.query(Users).filter(Users.id == user["id"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.cash_balance = update_data.cash_balance
    db.commit()
    db.refresh(db_user)

    print(f"Updated cash balance for user {user['id']}: {db_user.cash_balance}")  # debugging

    return {"message": "Cash balance updated successfully"}