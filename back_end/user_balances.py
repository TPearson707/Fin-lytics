from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from datetime import datetime
from database import SessionLocal
from models import Users, Plaid_Bank_Account, User_Balance
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
    Unified endpoint to fetch user balances - handles both Plaid and non-Plaid users seamlessly.
    Returns balance data with permission flags for frontend editing control.
    """
    try:
        print("User received:", user)  # debug: Print the user object
        db_user = db.query(Users).filter(Users.id == user["id"]).first()
        
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check if user has Plaid token
        has_plaid = bool(db_user.plaid_access_token)
        
        # Initialize default response structure
        response_data = {
            "has_plaid": has_plaid,
            "balances_editable": {
                "checking": not has_plaid,  # Read-only if Plaid connected
                "savings": not has_plaid,   # Read-only if Plaid connected
                "cash": True                # Always editable
            },
            "manual_balances": {
                "checking": 0.0,
                "savings": 0.0,
                "cash": 0.0
            },
            "plaid_balances": [],
            "cash_balance": 0.0
        }

        if has_plaid:
            # Try to get Plaid balances
            try:
                decrypted_access_token = decrypt_token(db_user.plaid_access_token)
                request = AccountsBalanceGetRequest(
                    access_token=decrypted_access_token,
                    client_id=PLAID_CLIENT_ID,
                    secret=PLAID_SECRET
                )
                plaid_response = client.accounts_balance_get(request).to_dict()

                # Process Plaid balances
                response_data["plaid_balances"] = [
                    {
                        "account_id": account["account_id"],
                        "name": account["name"],
                        "type": account["type"],
                        "subtype": account["subtype"],
                        "balance": account["balances"]["available"] or 0.0,
                    }
                    for account in plaid_response["accounts"]
                ]
                
                print("Successfully loaded Plaid balances")
            except Exception as plaid_error:
                print(f"Plaid error: {plaid_error}, falling back to manual balances")
                # If Plaid fails, treat as non-Plaid user
                response_data["has_plaid"] = False
                response_data["balances_editable"] = {
                    "checking": True,
                    "savings": True,
                    "cash": True
                }

        # Always get manual balances (for non-Plaid users or as fallback)
        manual_balances = db.query(User_Balance).filter(User_Balance.id == user["id"]).all()
        
        # Process all manual balances including cash (all stored in User_Balance table)
        cash_balance = 0.0
        for balance in manual_balances:
            if balance.balance_name in ["checking", "savings", "cash"]:
                response_data["manual_balances"][balance.balance_name] = float(balance.balance_amount)
                if balance.balance_name == "cash":
                    cash_balance = float(balance.balance_amount)

        # Set cash balance (from User_Balance table like other manual balances)
        print(f"DEBUG: User {user['id']} cash_balance from User_Balance table: {cash_balance}")  # Debug logging
        response_data["cash_balance"] = cash_balance
        response_data["manual_balances"]["cash"] = cash_balance

        # Use jsonable_encoder to ensure the response is JSON serializable
        from fastapi.encoders import jsonable_encoder
        return jsonable_encoder(response_data)
        
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions without converting to 500
        raise http_exc
    except Exception as e:
        print("Error in /user_balances/ endpoint:", str(e))  # debug
        raise HTTPException(status_code=500, detail="Internal Server Error")



class CashBalanceUpdate(BaseModel):
    cash_balance: float

class ManualBalanceUpdate(BaseModel):
    balance_name: str  # checking, savings, or cash
    new_amount: float

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

@router.put("/manual_balance_update/")
async def update_manual_balance(
    update_data: ManualBalanceUpdate,
    user: Annotated[dict, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Update manual balance for non-Plaid accounts or cash.
    This endpoint respects Plaid permissions - won't update Plaid-connected accounts.
    """
    db_user = db.query(Users).filter(Users.id == user["id"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has Plaid and is trying to edit Plaid-connected accounts
    has_plaid = bool(db_user.plaid_access_token)
    if has_plaid and update_data.balance_name in ["checking", "savings"]:
        raise HTTPException(
            status_code=403, 
            detail=f"{update_data.balance_name.title()} account is managed by Plaid and cannot be manually edited"
        )
    
    # Handle cash balance updates (stored in User_Balance table like other balances)
    if update_data.balance_name == "cash":
        # Find or create cash balance record
        balance_record = db.query(User_Balance).filter(
            User_Balance.id == user["id"],
            User_Balance.balance_name == "cash"
        ).first()
        
        if balance_record:
            print(f"DEBUG: Before update - User {user['id']} cash balance: {balance_record.balance_amount}")
            balance_record.balance_amount = update_data.new_amount
        else:
            print(f"DEBUG: Creating new cash balance record for User {user['id']}")
            balance_record = User_Balance(
                id=user["id"],
                balance_name="cash",
                balance_amount=update_data.new_amount
            )
            db.add(balance_record)
        
        db.commit()
        db.refresh(balance_record)
        print(f"DEBUG: After update - User {user['id']} cash balance: {balance_record.balance_amount}")
        return {"message": f"Cash balance updated to ${update_data.new_amount:.2f}"}
    
    # Handle checking/savings for non-Plaid users (stored in User_Balance table)
    balance_record = db.query(User_Balance).filter(
        User_Balance.id == user["id"],
        User_Balance.balance_name == update_data.balance_name
    ).first()
    
    if balance_record:
        # Update existing record
        balance_record.previous_balance = balance_record.balance_amount
        balance_record.balance_amount = update_data.new_amount
        balance_record.balance_date = datetime.utcnow()
    else:
        # Create new record
        balance_record = User_Balance(
            id=user["id"],
            balance_name=update_data.balance_name,
            balance_amount=update_data.new_amount,
            previous_balance=0.0,
            balance_date=datetime.utcnow()
        )
        db.add(balance_record)
    
    db.commit()
    db.refresh(balance_record)
    
    return {"message": f"{update_data.balance_name.title()} balance updated to ${update_data.new_amount:.2f}"}