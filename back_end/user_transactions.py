from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from database import SessionLocal
from models import Users, Plaid_Transactions, Plaid_Bank_Account, Budget_Goals
from auth import get_current_user
from plaid.api import plaid_api
from plaid.model.transactions_get_request import TransactionsGetRequest
from datetime import datetime, date, timedelta
from uuid import UUID, uuid4
import re
from category_colors import get_category_color
try:
    from dateutil.relativedelta import relativedelta
    HAS_DATEUTIL = True
except ImportError:
    HAS_DATEUTIL = False
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

def generate_recurring_transactions_from_user_transaction(db, base_transaction):
    """
    Generate recurring transaction instances from a User_Transaction record.
    """
    if not base_transaction.is_recurring:
        return []
    
    print(f"[RECURRING] Generating instances for transaction {base_transaction.transaction_id}")
    
    instances = []
    current_date = base_transaction.date
    end_date = base_transaction.end_date or (current_date + timedelta(days=365))  # Default 1 year
    max_instances = 1000  # Safety limit
    count = 0
    
    while current_date <= end_date and count < max_instances:
        # Calculate next occurrence
        next_date = calculate_next_occurrence(
            current_date,
            base_transaction.frequency_type,
            base_transaction.week_day,
            base_transaction.month_day,
            base_transaction.year_month,
            base_transaction.year_day
        )
        
        if next_date > end_date:
            break
            
        # Create new transaction instance
        from models import User_Transactions
        instance = User_Transactions(
            user_id=base_transaction.user_id,
            date=next_date,
            amount=base_transaction.amount,
            description=base_transaction.description,
            category_id=base_transaction.category_id,
            is_recurring=True,  # mark instances as recurring so frontend can identify them
            parent_transaction_id=base_transaction.transaction_id
        )
        
        db.add(instance)
        instances.append(instance)
        
        current_date = next_date
        count += 1
        
        print(f"[RECURRING] Created instance for {next_date}")
    
    if instances:
        db.commit()
        for instance in instances:
            db.refresh(instance)
    
    print(f"[RECURRING] Generated {len(instances)} instances")
    return instances

def calculate_next_occurrence(current_date, frequency_type, week_day=None, month_day=None, year_month=None, year_day=None):
    """
    Calculate the next occurrence of a recurring transaction based on the new frequency structure.
    """
    if frequency_type == 'weekly':
        # find the next occurrence of the specified weekday
        weekdays = {
            'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6
        }
        target_weekday = weekdays.get(week_day.lower(), 0)
        
        days_ahead = target_weekday - current_date.weekday()
        if days_ahead <= 0:  # Target day already happened this week
            days_ahead += 7
        
        return current_date + timedelta(days=days_ahead)
    
    elif frequency_type == 'monthly':
        # Nnext occurrence on the specified day of next month
        if HAS_DATEUTIL:
            next_month = current_date + relativedelta(months=1)
            try:
                return next_month.replace(day=month_day)
            except ValueError:
                # Handle case where month_day doesn't exist in next month (e.g., Feb 30)
                return next_month.replace(day=min(month_day, 28))
        else:
            # Fallback without dateutil
            next_month_approx = current_date + timedelta(days=30)
            try:
                return next_month_approx.replace(day=month_day)
            except ValueError:
                return next_month_approx.replace(day=min(month_day, 28))
    
    elif frequency_type == 'yearly':
        # Next occurrence on the specified month and day of next year
        if HAS_DATEUTIL:
            next_year = current_date + relativedelta(years=1)
            try:
                return next_year.replace(month=year_month, day=year_day)
            except ValueError:
                # Handle leap year issues
                return next_year.replace(month=year_month, day=min(year_day, 28))
        else:
            # Fallback without dateutil
            next_year_approx = current_date + timedelta(days=365)
            try:
                return next_year_approx.replace(month=year_month, day=year_day)
            except ValueError:
                return next_year_approx.replace(month=year_month, day=min(year_day, 28))
    
    return None


@router.get("/", status_code=status.HTTP_200_OK)
async def get_user_transactions(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    start_date: str | None = None,
    end_date: str | None = None,
    recurring_only: bool | None = None,
):
    """
    Fetch the user's transactions from Plaid and the database.
    """
    try:
        print(f"[TRANSACTIONS] User received: {user}")  # debug from budgeter branch
        db_user = db.query(Users).filter(Users.id == user["id"]).first()
        print(f"[TRANSACTIONS] Database user found: {db_user is not None}")  # DEbug

        # handle date parameters with defaults (dev branch flexibility)
        if end_date:
            end_dt = datetime.fromisoformat(end_date).date()
        else:
            end_dt = datetime.now().date()

        if start_date:
            start_dt = datetime.fromisoformat(start_date).date()
        else:
            start_dt = (datetime.now() - timedelta(days=30)).date()

        print(f"[TRANSACTIONS] Date range: {start_dt} to {end_dt}")

        transactions = []
        # handling: only attempt Plaid call if user has linked a Plaid access token
        DISABLE_PLAID_SANDBOX = False  # Set to True to disable Plaid sandbox transactions
        
        if db_user and db_user.plaid_access_token and not DISABLE_PLAID_SANDBOX:
            try:
                decrypted_access_token = decrypt_token(db_user.plaid_access_token)
                print(f"[PLAID] Decrypted access token available")  # Debug

                request = TransactionsGetRequest(
                    access_token=decrypted_access_token,
                    start_date=start_dt,
                    end_date=end_dt,
                    client_id=PLAID_CLIENT_ID,
                    secret=PLAID_SECRET
                )
                response = client.transactions_get(request).to_dict()
                print(f"[PLAID] Retrieved {len(response.get('transactions', []))} transactions")  # Debug

                transactions = []
                for t in response.get("transactions", []):
                    try:
                        tx_date = datetime.fromisoformat(str(t["date"])).date() if isinstance(t["date"], str) else t["date"]
                        if start_dt <= tx_date <= end_dt:
                            transactions.append({
                                "transaction_id": t["transaction_id"],
                                "account_id": t["account_id"],
                                "amount": t["amount"],
                                "currency": t.get("iso_currency_code"),
                                "category": ", ".join(t["category"]) if t.get("category") else None,
                                "merchant_name": t.get("merchant_name"),
                                "date": t["date"]
                            })
                    except Exception as date_err:
                        print(f"[PLAID] Error processing transaction date {t.get('date')}: {date_err}")
                        # Include transaction anyway if date parsing fails
                        transactions.append({
                            "transaction_id": t["transaction_id"],
                            "account_id": t["account_id"],
                            "amount": t["amount"],
                            "currency": t.get("iso_currency_code"),
                            "category": ", ".join(t["category"]) if t.get("category") else None,
                            "merchant_name": t.get("merchant_name"),
                            "date": t["date"]
                        })
                
                print(f"[PLAID] Filtered to {len(transactions)} transactions within date range")
            except Exception as plaid_err:
                # Graceful error handling: Log plaid error but continue to return DB transactions
                print(f"[PLAID] Fetch error (continuing with DB transactions): {str(plaid_err)}")
        else:
            if DISABLE_PLAID_SANDBOX:
                print("[PLAID] Sandbox transactions disabled for development")
            else:
                print("[PLAID] No access token found, using database transactions only")

        # Fetch transactions from the database with advanced error handling
        # This maintains schema flexibility for database migrations
        db_transactions = []
        try:
            # Try to query with frequency column (advanced feature)
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
            print(f"[DATABASE] Retrieved {len(db_transactions)} transactions from database")
        except Exception as db_err:
            # Schema migration compatibility: Handle missing frequency column gracefully
            if "Unknown column" in str(db_err) and "frequency" in str(db_err):
                print("[DATABASE] Frequency column not found, querying without it")
                # Query specific columns excluding frequency
                q = db.query(
                    Plaid_Transactions.id,
                    Plaid_Transactions.transaction_id,
                    Plaid_Transactions.account_id,
                    Plaid_Transactions.amount,
                    Plaid_Transactions.currency,
                    Plaid_Transactions.category,
                    Plaid_Transactions.merchant_name,
                    Plaid_Transactions.date,
                    Plaid_Transactions.created_at
                ).filter(
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

                # Convert query results to mock objects with frequency=None
                results = q.all()
                db_transactions = []
                for r in results:
                    # Create a mock object that behaves like Plaid_Transactions
                    mock_transaction = type('MockTransaction', (), {
                        'id': r.id,
                        'transaction_id': r.transaction_id,
                        'account_id': r.account_id,
                        'amount': r.amount,
                        'currency': r.currency,
                        'category': r.category,
                        'merchant_name': r.merchant_name,
                        'date': r.date,
                        'created_at': r.created_at,
                        'frequency': None
                    })()
                    db_transactions.append(mock_transaction)
                print(f"[DATABASE] Fallback query retrieved {len(db_transactions)} transactions")
            else:
                raise db_err

        # Transform database transactions with enhanced data structure
        db_transactions_data = [
            {
                "transaction_id": t.transaction_id,
                "account_id": t.account_id,
                "amount": t.amount,
                "currency": t.currency,
                "category": t.category,
                "merchant_name": t.merchant_name,
                "date": t.date,
                "frequency": getattr(t, 'frequency', None),  # Handle missing column gracefully
                "is_recurring": bool(getattr(t, 'frequency', None))
            }
            for t in db_transactions
        ]

        print(f"[DATABASE] Processed {len(db_transactions_data)} transaction records")

        # Fetch User_Transactions (user-entered transactions)
        user_transactions = []
        try:
            from models import User_Transactions, User_Categories, User_Transaction_Category_Link
            user_txns = db.query(User_Transactions).filter(
                User_Transactions.user_id == user["id"]
            )
            if start_date:
                user_txns = user_txns.filter(User_Transactions.date >= start_dt)
            if end_date:
                user_txns = user_txns.filter(User_Transactions.date <= end_dt)
            if recurring_only:
                # Filter for recurring transactions only - exclude generated instances (child transactions)
                user_txns = user_txns.filter(
                    User_Transactions.is_recurring == True,
                    User_Transactions.parent_transaction_id == None
                )
            
            user_txns = user_txns.all()
            print(f"[USER_TRANSACTIONS] Retrieved {len(user_txns)} user transactions")
            
            user_transactions = []
            for t in user_txns:
                category_name = None
                try:
                    category_link = db.query(User_Transaction_Category_Link).filter(
                        User_Transaction_Category_Link.transaction_id == t.transaction_id
                    ).first()
                    
                    if category_link:
                        user_category = db.query(User_Categories).filter(
                            User_Categories.id == category_link.category_id
                        ).first()
                        if user_category:
                            category_name = user_category.name
                
                except Exception as cat_err:
                    print(f"[USER_TRANSACTIONS] Error getting category for transaction {t.transaction_id}: {cat_err}")
                
                user_transactions.append({
                    "id": t.transaction_id,  
                    "transaction_id": f"user-{t.transaction_id}",  #disinguish from plaid
                    "account_id": "manual",
                    "amount": t.amount,
                    "currency": "USD",
                    "category": category_name, 
                    "merchant_name": t.description,
                    "date": t.date.isoformat() if t.date else None,
                    "parent_transaction_id": getattr(t, 'parent_transaction_id', None),
                    "is_user_transaction": True,
                    "is_recurring": getattr(t, 'is_recurring', False),
                    "recurring_enabled": getattr(t, 'recurring_enabled', None),
                    "frequency_type": getattr(t, 'frequency_type', None),
                })
        
        except Exception as user_tx_err:
            print(f"[USER_TRANSACTIONS] Error fetching user transactions: {user_tx_err}")
            user_transactions = []

        print(f"[DATABASE] Processed {len(db_transactions_data)} transaction records")

        # generate future recurring transactions (advanced feature)
        # this enables budget projections and financial planning
        recurring_transactions = []
        try:
            recurring_base_transactions = [t for t in db_transactions if getattr(t, 'frequency', None)]
            print(f"[RECURRING] Found {len(recurring_base_transactions)} recurring base transactions")
            
            for recurring_transaction in recurring_base_transactions:
                # this is for displaying recurring transactions, not creating them
                # we'll use a simpler approach here for backward compatibility
                pass
        except AttributeError:
            # Frequency column doesn't exist yet, skip recurring transactions
            print("[RECURRING] Frequency column not available, skipping recurring transactions")
            pass

        response_data = {
            "plaid_transactions": transactions, 
            "db_transactions": db_transactions_data,
            "user_transactions": user_transactions,  # Add user-entered transactions
            "recurring_transactions": recurring_transactions,
            "summary": {
                "plaid_count": len(transactions),
                "db_count": len(db_transactions_data),
                "user_count": len(user_transactions),
                "recurring_count": len(recurring_transactions),
                "date_range": {"start": start_dt.isoformat(), "end": end_dt.isoformat()}
            }
        }
        
        print(f"[RESPONSE] Returning {response_data['summary']}")
        return response_data

    except Exception as e:
        print(f"[ERROR] Error in get_user_transactions: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    payload: dict,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Create a manual transaction in the User_Transactions table for the user.
    
    Expected payload: { amount, category, merchant_name, date }
    """
    try:
        print(f"[CREATE_TRANSACTION] Creating user transaction for user {user['id']}")
        db_user = db.query(Users).filter(Users.id == user["id"]).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Minimal validation for User_Transactions
        required = ["amount", "date"]
        for r in required:
            if r not in payload:
                raise HTTPException(status_code=400, detail=f"Missing field: {r}")

        print(f"[CREATE_TRANSACTION] Payload validated: {list(payload.keys())}")

        # Handle category creation and get category_id
        category_id = None
        if payload.get("category"):
            category_name = payload["category"]
            print(f"[CREATE_TRANSACTION] Processing category: {category_name}")
            
            # Check if category exists for this user
            from models import User_Categories, User_Transaction_Category_Link
            user_category = db.query(User_Categories).filter(
                User_Categories.user_id == user["id"],
                User_Categories.name == category_name
            ).first()
            
            # Create category if it doesn't exist
            if not user_category:
                print(f"[CREATE_TRANSACTION] Creating new category: {category_name}")
                
                # Get color using shared utility
                assigned_color = get_category_color(category_name)
                
                user_category = User_Categories(
                    user_id=user["id"],
                    name=category_name,
                    color=assigned_color,
                    weekly_limit=None
                )
                db.add(user_category)
                db.commit()
                db.refresh(user_category)
                print(f"[CREATE_TRANSACTION] Created category with ID: {user_category.id}")
            
            category_id = user_category.id

        # Create User_Transactions record
        from models import User_Transactions
        
        # Create basic transaction data
        transaction_data = {
            "user_id": user["id"],
            "date": datetime.fromisoformat(payload["date"]).date(),
            "amount": payload["amount"],
            "description": payload.get("merchant_name", "Manual Transaction"),
            "category_id": category_id
        }
        
        # Add recurring fields only if they exist in the model (database schema)
        try:
            if payload.get("is_recurring"):
                transaction_data.update({
                    "is_recurring": True,
                    "frequency_type": payload.get("frequency_type"),
                    "week_day": payload.get("week_day"),
                    "month_day": payload.get("month_day"),
                    "year_month": payload.get("year_month"),
                    "year_day": payload.get("year_day"),
                    "end_date": datetime.fromisoformat(payload["end_date"]).date() if payload.get("end_date") else None
                })
        except Exception as schema_err:
            print(f"[CREATE_TRANSACTION] Recurring fields not available in database schema: {schema_err}")
            # Continue with basic transaction
        
        new_transaction = User_Transactions(**transaction_data)
        
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)
        print(f"[CREATE_TRANSACTION] Created User_Transaction with ID: {new_transaction.transaction_id}")
        
        # Generate recurring transactions if this is a recurring transaction
        recurring_instances = []
        if payload.get("is_recurring"):
            try:
                print(f"[CREATE_TRANSACTION] Generating recurring transactions for {new_transaction.transaction_id}")
                recurring_instances = generate_recurring_transactions_from_user_transaction(db, new_transaction)
                print(f"[CREATE_TRANSACTION] Generated {len(recurring_instances)} recurring instances")
            except Exception as recurring_err:
                print(f"[CREATE_TRANSACTION] Error generating recurring transactions: {recurring_err}")
                # Continue anyway, the main transaction was created successfully

        # Create User_Transaction_Category_Link for main transaction and recurring instances
        if category_id:
            try:
                # Link for main transaction
                transaction_link = User_Transaction_Category_Link(
                    transaction_id=new_transaction.transaction_id,
                    category_id=category_id
                )
                db.add(transaction_link)
                
                # Create links for recurring instances if they exist
                if payload.get("is_recurring") and recurring_instances:
                    for instance in recurring_instances:
                        instance_link = User_Transaction_Category_Link(
                            transaction_id=instance.transaction_id,
                            category_id=category_id
                        )
                        db.add(instance_link)
                
                db.commit()
                print(f"[CREATE_TRANSACTION] Created user transaction-category links")
            except Exception as link_err:
                print(f"[CREATE_TRANSACTION] Error creating user transaction-category link: {link_err}")
                # Continue anyway, the transaction was created successfully

        # Check if user has budget goals, if not create defaults
        await check_and_create_default_budget_goals(user["id"], db)
        
        print(f"[CREATE_TRANSACTION] Successfully created user transaction: {new_transaction.transaction_id}")
        return {"status": "created", "transaction_id": new_transaction.transaction_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[CREATE_TRANSACTION] Error creating user transaction: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error creating transaction")

async def check_and_create_default_budget_goals(user_id: int, db: Session):
    """
    Check if user has any category budget goals. If not, create default ones.
    """
    try:
        # Check if user already has category goals
        existing_goals = db.query(Budget_Goals).filter(
            Budget_Goals.user_id == user_id,
            Budget_Goals.goal_type == "category",
            Budget_Goals.is_active == True
        ).count()
        
        if existing_goals > 0:
            print(f"[BUDGET_GOALS] User {user_id} already has {existing_goals} category goals")
            return
        
        print(f"[BUDGET_GOALS] Creating default category goals for user {user_id}")
        
        # Default categories with reasonable monthly budgets
        default_categories = [
            {"name": "Food & Dining", "amount": 500.0},
            {"name": "Entertainment", "amount": 200.0},
            {"name": "Transportation", "amount": 300.0},
            {"name": "Utilities", "amount": 150.0},
            {"name": "Healthcare", "amount": 100.0},
            {"name": "Shopping", "amount": 250.0},
        ]
        
        goals_created = 0
        for category in default_categories:
            budget_goal = Budget_Goals(
                user_id=user_id,
                goal_type="category",
                goal_name=f"{category['name']} Budget",
                goal_amount=category["amount"],
                time_period="monthly",
                category_name=category["name"]
            )
            db.add(budget_goal)
            goals_created += 1
        
        db.commit()
        print(f"[BUDGET_GOALS] Created {goals_created} default category goals for user {user_id}")
        
    except Exception as e:
        print(f"[BUDGET_GOALS] Error creating default budget goals: {str(e)}")
        # Don't raise exception, just log error - transaction creation should not fail
@router.put("/{transaction_id}", status_code=status.HTTP_200_OK)
async def update_user_transaction(
    transaction_id: int,
    payload: dict,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Update a user transaction in the User_Transactions table.
    """
    try:
        print(f"[UPDATE_TRANSACTION] Updating user transaction {transaction_id} for user {user['id']}")
        
        # Find the transaction
        from models import User_Transactions, User_Categories, User_Transaction_Category_Link
        user_transaction = db.query(User_Transactions).filter(
            User_Transactions.transaction_id == transaction_id,
            User_Transactions.user_id == user["id"]
        ).first()
        
        if not user_transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Update fields if provided
        if "amount" in payload:
            user_transaction.amount = payload["amount"]
        if "date" in payload:
            user_transaction.date = datetime.fromisoformat(payload["date"]).date()
        if "merchant_name" in payload or "description" in payload:
            user_transaction.description = payload.get("merchant_name") or payload.get("description")
        
        # Handle category update
        if "category" in payload and payload["category"]:
            category_name = payload["category"]
            
            # Find or create category
            user_category = db.query(User_Categories).filter(
                User_Categories.user_id == user["id"],
                User_Categories.name == category_name
            ).first()
            
            if not user_category:
                user_category = User_Categories(
                    user_id=user["id"],
                    name=category_name,
                    color="#4CAF50",
                    weekly_limit=None
                )
                db.add(user_category)
                db.commit()
                db.refresh(user_category)
            
            # Update category link
            existing_link = db.query(User_Transaction_Category_Link).filter(
                User_Transaction_Category_Link.transaction_id == transaction_id
            ).first()
            
            if existing_link:
                existing_link.category_id = user_category.id
            else:
                new_link = User_Transaction_Category_Link(
                    transaction_id=transaction_id,
                    category_id=user_category.id
                )
                db.add(new_link)
        
        db.commit()
        db.refresh(user_transaction)
        
        print(f"[UPDATE_TRANSACTION] Successfully updated user transaction: {transaction_id}")
        return {"status": "updated", "transaction_id": transaction_id}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[UPDATE_TRANSACTION] Error updating user transaction: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail="Error updating transaction")

@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_transaction(
    transaction_id: int,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Delete a user transaction from the User_Transactions table.
    """
    try:
        print(f"[DELETE_TRANSACTION] Deleting user transaction {transaction_id} for user {user['id']}")
        
        # Find the transaction
        from models import User_Transactions, User_Transaction_Category_Link
        user_transaction = db.query(User_Transactions).filter(
            User_Transactions.transaction_id == transaction_id,
            User_Transactions.user_id == user["id"]
        ).first()
        
        if not user_transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Delete category links first
        category_links = db.query(User_Transaction_Category_Link).filter(
            User_Transaction_Category_Link.transaction_id == transaction_id
        ).all()
        
        for link in category_links:
            db.delete(link)
        
        # Delete the transaction
        db.delete(user_transaction)
        db.commit()
        
        print(f"[DELETE_TRANSACTION] Successfully deleted user transaction: {transaction_id}")
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DELETE_TRANSACTION] Error deleting user transaction: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting transaction")


@router.delete('/recurring/{parent_transaction_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring_transaction_and_children(
    parent_transaction_id: int,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    Delete a recurring parent transaction and all of its child occurrences for the current user.
    """
    try:
        print(f"[DELETE_RECURRING] Deleting parent {parent_transaction_id} and children for user {user['id']}")
        from models import User_Transactions, User_Transaction_Category_Link

        # Find parent transaction
        parent_tx = db.query(User_Transactions).filter(
            User_Transactions.transaction_id == parent_transaction_id,
            User_Transactions.user_id == user['id']
        ).first()

        if not parent_tx:
            raise HTTPException(status_code=404, detail="Parent recurring transaction not found")

        # Find child transactions that reference this parent
        children = db.query(User_Transactions).filter(
            User_Transactions.parent_transaction_id == parent_transaction_id,
            User_Transactions.user_id == user['id']
        ).all()

        # Delete category links for children and parent
        links = db.query(User_Transaction_Category_Link).filter(
            User_Transaction_Category_Link.transaction_id.in_([parent_transaction_id] + [c.transaction_id for c in children])
        ).all()

        for link in links:
            db.delete(link)

        # Delete child transactions
        for c in children:
            db.delete(c)

        # Delete parent transaction
        db.delete(parent_tx)

        db.commit()
        print(f"[DELETE_RECURRING] Deleted parent and {len(children)} children")
        return None

    except HTTPException:
        raise
    except Exception as e:
        print(f"[DELETE_RECURRING] Error deleting recurring transactions: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting recurring transactions")
