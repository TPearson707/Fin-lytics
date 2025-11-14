from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal
from models import Plaid_Transactions, Transaction_Category_Link, Users
from auth import get_current_user
from pydantic import BaseModel

router = APIRouter(
    prefix="/entered_transactions",
    tags=["Entered Transactions"]
)

# ==================== Dependencies ====================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Type aliases for dependencies
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

# ==================== Schemas ====================
class UserTransactionCreate(BaseModel):
    user_id: int
    date: str
    amount: float
    description: str | None = None
    category_id: int

class UserTransactionUpdate(BaseModel):
    date: str | None = None
    amount: float | None = None
    description: str | None = None
    category_id: int | None = None

# ==================== Routes ====================
@router.post("/", status_code=status.HTTP_201_CREATED)
async def add_user_transaction(
    data: UserTransactionCreate,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)]
):
    """Create a new user-entered transaction"""
    try:
        from models import Plaid_Bank_Account
        import uuid
        
        # Find or create a manual account for the user
        manual_account = db.query(Plaid_Bank_Account).filter(
            Plaid_Bank_Account.user_id == user["id"],
            Plaid_Bank_Account.name == 'Manual Entries'
        ).first()
        
        if not manual_account:
            # Create a manual account for user-entered transactions
            manual_account_id = f"manual-{user['id']}-{uuid.uuid4().hex[:8]}"
            manual_account = Plaid_Bank_Account(
                user_id=user["id"],
                account_id=manual_account_id,
                name='Manual Entries',
                type='manual',
                subtype='manual',
                current_balance=0.0,
                available_balance=0.0,
                currency='USD'
            )
            db.add(manual_account)
            db.commit()
            db.refresh(manual_account)
        
        # Create the transaction
        transaction_id = f"manual-{uuid.uuid4().hex}"
        new_transaction = Plaid_Transactions(
            transaction_id=transaction_id,
            account_id=manual_account.account_id,
            amount=data.amount,
            currency='USD',
            merchant_name=data.description,  # Use description as merchant name
            date=data.date
        )
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)

        # Create Transaction_Category_Link if category_id is provided
        if hasattr(data, 'category_id') and data.category_id:
            new_link = Transaction_Category_Link(
                transaction_id=new_transaction.transaction_id,
                category_id=data.category_id
            )
            db.add(new_link)
            db.commit()

        return new_transaction.to_dict()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating transaction: {str(e)}")

@router.get("/", status_code=status.HTTP_200_OK)
async def get_user_transactions(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)]
):
    """Get all user-entered transactions for the authenticated user"""
    try:
        # Join Plaid_Transactions with Plaid_Bank_Account to filter by user_id
        from models import Plaid_Bank_Account
        transactions = db.query(Plaid_Transactions).join(
            Plaid_Bank_Account, 
            Plaid_Transactions.account_id == Plaid_Bank_Account.account_id
        ).filter(Plaid_Bank_Account.user_id == user["id"]).all()
        return [transaction.to_dict() for transaction in transactions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching transactions: {str(e)}")

@router.get("/combined", status_code=status.HTTP_200_OK)
async def get_combined_transactions(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)]
):
    """Get both Plaid and user-entered transactions for the authenticated user"""
    try:
        # Get user-entered transactions
        from models import Plaid_Bank_Account
        user_transactions = db.query(Plaid_Transactions).join(
            Plaid_Bank_Account, 
            Plaid_Transactions.account_id == Plaid_Bank_Account.account_id
        ).filter(Plaid_Bank_Account.user_id == user["id"]).all()
        user_transactions_data = [transaction.to_dict() for transaction in user_transactions]
        for transaction in user_transactions_data:
            transaction["source"] = "user_entered"

        # Get Plaid transactions if available
        plaid_transactions_data = []
        try:
            db_user = db.query(Users).filter(Users.id == user["id"]).first()
            if db_user and db_user.plaid_access_token:
                db_transactions = db.query(Plaid_Transactions).join(
                    Plaid_Bank_Account, 
                    Plaid_Transactions.account_id == Plaid_Bank_Account.account_id
                ).filter(Plaid_Bank_Account.user_id == user["id"]).all()
                for t in db_transactions:
                    plaid_tx = {
                        "transaction_id": t.transaction_id,
                        "account_id": t.account_id,
                        "amount": t.amount,
                        "currency": t.currency,
                        "category": t.category,
                        "merchant_name": t.merchant_name,
                        "date": t.date.isoformat() if t.date else None,
                        "source": "plaid"
                    }
                    plaid_transactions_data.append(plaid_tx)
        except Exception as plaid_error:
            print(f"Plaid transactions not available: {plaid_error}")

        # Combine and sort by date
        all_transactions = user_transactions_data + plaid_transactions_data
        all_transactions.sort(key=lambda x: x.get("date", ""), reverse=True)

        return {
            "user_transactions": user_transactions_data,
            "plaid_transactions": plaid_transactions_data,
            "all_transactions": all_transactions
        }
    except Exception as e:
        import traceback
        print("Error in get_combined_transactions:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching combined transactions: {str(e)}")

@router.put("/{transaction_id}", status_code=status.HTTP_200_OK)
async def update_user_transaction(
    transaction_id: int,
    data: UserTransactionUpdate,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)]
):
    """Update a user-entered transaction"""
    try:
        from models import Plaid_Bank_Account
        transaction = db.query(Plaid_Transactions).join(
            Plaid_Bank_Account, 
            Plaid_Transactions.account_id == Plaid_Bank_Account.account_id
        ).filter(
            Plaid_Transactions.transaction_id == transaction_id,
            Plaid_Bank_Account.user_id == user["id"] 
        ).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        if data.date is not None:
            transaction.date = data.date
        if data.amount is not None:
            transaction.amount = data.amount
        if data.description is not None:
            transaction.description = data.description
        if data.category_id is not None:
            transaction.category_id = data.category_id
            # Update Transaction_Category_Link
            link = db.query(Transaction_Category_Link).filter(
                Transaction_Category_Link.transaction_id == str(transaction_id)
            ).first()
            if link:
                link.category_id = data.category_id
            else:
                # If link doesn't exist, create it
                new_link = Transaction_Category_Link(
                    transaction_id=str(transaction_id),
                    category_id=data.category_id
                )
                db.add(new_link)
        db.commit()
        db.refresh(transaction)
        return transaction.to_dict()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating transaction: {str(e)}")

@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_transaction(
    transaction_id: int,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)]
):
    """Delete a user-entered transaction"""
    try:
        from models import Plaid_Bank_Account
        transaction = db.query(Plaid_Transactions).join(
            Plaid_Bank_Account, 
            Plaid_Transactions.account_id == Plaid_Bank_Account.account_id
        ).filter(
            Plaid_Transactions.transaction_id == transaction_id,
            Plaid_Bank_Account.user_id == user["id"]
        ).first()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        # Delete Transaction_Category_Links first
        links = db.query(Transaction_Category_Link).filter(
            Transaction_Category_Link.transaction_id == str(transaction_id)
        ).all()
        for link in links:
            db.delete(link)
        db.delete(transaction)
        db.commit()
        return None
    except Exception as e:
        import traceback
        print("Error deleting transaction:", traceback.format_exc())
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting transaction: {str(e)}")
