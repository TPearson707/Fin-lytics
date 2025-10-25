from fastapi import FastAPI, Depends, HTTPException, status, APIRouter
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal
from models import Plaid_Transactions, User_Categories, Users, Transaction_Category_Link, Plaid_Bank_Account
from pydantic import BaseModel
from user_categories import get_user_categories

router = APIRouter(
    prefix='/pie_chart',
    tags=['pie_chart']
)

# Dependencies
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

# gets the sum of expenses per category 
def get_total_expenses_per_category(user_id: int, db: Session):
    categories = get_user_categories(user_id, db)
    category_expenses = {}

    for category in categories:
        try:
            # Get Plaid transactions for this category
            plaid_transactions = db.query(
                Plaid_Transactions.amount
            ).join(
                Plaid_Bank_Account, 
                Plaid_Transactions.account_id == Plaid_Bank_Account.account_id
            ).join(
                Transaction_Category_Link,
                Plaid_Transactions.transaction_id == Transaction_Category_Link.transaction_id
            ).filter(
                Plaid_Bank_Account.user_id == user_id,
                Transaction_Category_Link.category_id == category["id"]
            ).all()
            
            # Get User transactions for this category
            from models import User_Transactions, User_Transaction_Category_Link
            user_transactions = db.query(
                User_Transactions.amount
            ).join(
                User_Transaction_Category_Link,
                User_Transactions.transaction_id == User_Transaction_Category_Link.transaction_id
            ).filter(
                User_Transactions.user_id == user_id,
                User_Transaction_Category_Link.category_id == category["id"]
            ).all()
            
            # Combine and calculate total expenses (use absolute value for expenses)
            plaid_total = sum(abs(transaction.amount) for transaction in plaid_transactions if transaction.amount)
            user_total = sum(abs(transaction.amount) for transaction in user_transactions if transaction.amount)
            total = plaid_total + user_total
            
            category_expenses[category["name"]] = total
        except Exception as e:
            print(f"Error processing category {category['name']}: {str(e)}")
            category_expenses[category["name"]] = 0

    return category_expenses

# Routes
@router.get("/")
async def get_pie_chart_default():
    """
    Returns an error message when no user_id is provided.
    """
    raise HTTPException(status_code=400, detail="user_id is required")

@router.get("/{user_id}")
async def get_pie_chart_data_as_json(user_id: int, db: Annotated[Session, Depends(get_db)]):
    """
    Returns the pie chart data as a JSON string with total expenses per category.
    """
    return get_total_expenses_per_category(user_id, db)
