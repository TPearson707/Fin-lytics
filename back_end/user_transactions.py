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
    db: Annotated[Session, Depends(get_db)],
    start_date: str | None = None,
    end_date: str | None = None,
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

        # Fetch transactions from Plaid (respect optional query params)
        if end_date:
            end_dt = datetime.fromisoformat(end_date).date()
        else:
            end_dt = datetime.now().date()

        if start_date:
            start_dt = datetime.fromisoformat(start_date).date()
        else:
            start_dt = (datetime.now() - timedelta(days=30)).date()

        request = TransactionsGetRequest(
            access_token=decrypted_access_token,
            start_date=start_dt,
            end_date=end_dt,
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
        # Optionally filter DB transactions by date range
        q = db.query(Plaid_Transactions).filter(
            Plaid_Transactions.account_id.in_(
                db.query(Plaid_Bank_Account.account_id).filter(
                    Plaid_Bank_Account.user_id == user["id"]
                )
            )
        )
        if start_date:
            q = q.filter(Plaid_Transactions.date >= start_dt)
        if end_date:
            q = q.filter(Plaid_Transactions.date <= end_dt)

        db_transactions = q.all()

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


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    payload: dict,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Create a manual transaction in the Plaid_Transactions table for the user's account.
    Expected payload: { transaction_id, account_id, amount, currency, category, merchant_name, date }
    """
    try:
        db_user = db.query(Users).filter(Users.id == user["id"]).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Minimal validation
        required = ["transaction_id", "account_id", "amount", "date"]
        for r in required:
            if r not in payload:
                raise HTTPException(status_code=400, detail=f"Missing field: {r}")

        # Create Plaid_Transactions row
        new = Plaid_Transactions(
            transaction_id=payload["transaction_id"],
            account_id=payload["account_id"],
            amount=payload["amount"],
            currency=payload.get("currency"),
            category=payload.get("category"),
            merchant_name=payload.get("merchant_name"),
            date=datetime.fromisoformat(payload["date"]).date()
        )
        db.add(new)
        db.commit()
        db.refresh(new)

        return {"status": "created", "transaction_id": new.transaction_id}
    except HTTPException:
        raise
    except Exception as e:
        print("Error creating transaction:", str(e))
        raise HTTPException(status_code=500, detail="Error creating transaction")