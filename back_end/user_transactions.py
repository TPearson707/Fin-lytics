from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal
from models import Users, Plaid_Transactions, Plaid_Bank_Account
from auth import get_current_user
from plaid.api import plaid_api
from plaid.model.transactions_get_request import TransactionsGetRequest
from datetime import datetime, timedelta
from plaid_routes import decrypt_token, PLAID_CLIENT_ID, PLAID_SECRET, client

router = APIRouter(
    prefix="/user_transactions",
    tags=["User Transactions"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", status_code=status.HTTP_200_OK)
async def get_user_transactions(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)]
):
    """
    Fetch the user's transactions from Plaid and the database.
    """
    try:
        print("User received:", user)  # Debug: Print the user object
        db_user = db.query(Users).filter(Users.id == user["id"]).first()
        print("Database user:", db_user)  # Debug: Print the database user

        if not db_user or not db_user.plaid_access_token:
            print("Plaid account not linked or user not found")  # Debug
            raise HTTPException(status_code=400, detail="Plaid account not linked")

        decrypted_access_token = decrypt_token(db_user.plaid_access_token)
        print("Decrypted access token:", decrypted_access_token)  # Debug

        # Fetch transactions from Plaid
        end_date = datetime.now().date()
        start_date = (datetime.now() - timedelta(days=30)).date()

        request = TransactionsGetRequest(
            access_token=decrypted_access_token,
            start_date=start_date,
            end_date=end_date,
            client_id=PLAID_CLIENT_ID,
            secret=PLAID_SECRET
        )
        response = client.transactions_get(request).to_dict()
        print("Plaid transactions response:", response)  # Debug

        transactions = [
            {
                "transaction_id": t["transaction_id"],
                "account_id": t["account_id"],
                "amount": t["amount"],
                "currency": t.get("iso_currency_code"),
                "category": ", ".join(t["category"]) if t.get("category") else None,
                "merchant_name": t.get("merchant_name"),
                "date": t["date"]
            }
            for t in response.get("transactions", [])
        ]

        # Fetch transactions from the database
        db_transactions = db.query(Plaid_Transactions).filter(
            Plaid_Transactions.account_id.in_(
                db.query(Plaid_Bank_Account.account_id).filter(
                    Plaid_Bank_Account.user_id == user["id"]
                )
            )
        ).all()

        db_transactions_data = [
            {
                "transaction_id": t.transaction_id,
                "account_id": t.account_id,
                "amount": t.amount,
                "currency": t.currency,
                "category": t.category,
                "merchant_name": t.merchant_name,
                "date": t.date
            }
            for t in db_transactions
        ]

        return {"plaid_transactions": transactions, "db_transactions": db_transactions_data}

    except Exception as e:
        print("Error in /user_transactions/ endpoint:", str(e))  # Debug
        raise HTTPException(status_code=500, detail="Internal Server Error")