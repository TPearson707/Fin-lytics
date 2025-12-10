from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from database import SessionLocal
from models import Budget_Goals, User_Categories, Plaid_Transactions, Plaid_Bank_Account, Transaction_Category_Link, User_Transactions, User_Transaction_Category_Link
from pydantic import BaseModel
from datetime import datetime, timedelta
from auth import get_current_user

router = APIRouter(
    prefix="/budget-goals", 
    tags=["budget_goals"]
)

# ==================== Dependencies ====================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

# ==================== Schemas ====================
class CreateBudgetGoalRequest(BaseModel):
    goal_type: str  # 'annual' or 'category'
    goal_name: str
    goal_amount: float
    time_period: Optional[str] = None  # 'monthly' for categories, 'yearly' for annual
    category_name: Optional[str] = None  # for category-based goals

class UpdateBudgetGoalRequest(BaseModel):
    goal_name: Optional[str] = None
    goal_amount: Optional[float] = None
    time_period: Optional[str] = None
    category_name: Optional[str] = None
    is_active: Optional[bool] = None

class BudgetGoalResponse(BaseModel):
    id: int
    goal_type: str
    goal_name: str
    goal_amount: float
    time_period: Optional[str]
    category_name: Optional[str]
    created_at: datetime
    updated_at: datetime
    is_active: bool
    spent_this_month: Optional[float] = 0.0  # Add spending calculation
    weekly_limit: Optional[float] = None  # For frontend compatibility

    class Config:
        from_attributes = True

# ==================== Helper Functions ====================
def calculate_monthly_spending_for_category(user_id: int, category_name: str, db: Session) -> float:
    """Calculate total spending for a category in the current month."""
    try:
        # Calculate first day of current month
        now = datetime.now()
        first_day_of_month = datetime(now.year, now.month, 1).date()
        
        # Find the category ID
        category = db.query(User_Categories).filter(
            User_Categories.user_id == user_id,
            User_Categories.name == category_name
        ).first()
        
        if not category:
            return 0.0
        
        # Get Plaid transactions for this category (current month)
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
            Transaction_Category_Link.category_id == category.id,
            Plaid_Transactions.date >= first_day_of_month
        ).all()
        
        # Get User transactions for this category (current month)
        user_transactions = db.query(
            User_Transactions.amount
        ).join(
            User_Transaction_Category_Link,
            User_Transactions.transaction_id == User_Transaction_Category_Link.transaction_id
        ).filter(
            User_Transactions.user_id == user_id,
            User_Transaction_Category_Link.category_id == category.id,
            User_Transactions.date >= first_day_of_month
        ).all()
        
        # Calculate total spending (use absolute value for expenses)
        plaid_total = sum(abs(transaction.amount) for transaction in plaid_transactions if transaction.amount)
        user_total = sum(abs(transaction.amount) for transaction in user_transactions if transaction.amount)
        
        return plaid_total + user_total
        
    except Exception as e:
        return 0.0

# ==================== Routes ====================

@router.get("/", response_model=List[BudgetGoalResponse])
async def get_budget_goals(user: Annotated[dict, Depends(get_current_user)], 
                          db: db_dependency,
                          goal_type: Optional[str] = None):
    """Get all budget goals for the current user, optionally filtered by goal_type. For category, return all user categories merged with their budget goals."""
    if goal_type == "category":
        # Get all user categories
        categories = db.query(User_Categories).filter(User_Categories.user_id == user["id"]).all()
        # Get all active category budget goals
        goals = db.query(Budget_Goals).filter(Budget_Goals.user_id == user["id"], Budget_Goals.goal_type == "category", Budget_Goals.is_active == True).all()
        # Map by category_name for quick lookup
        goal_map = {g.category_name: g for g in goals}
        result = []
        for cat in categories:
            # Calculate monthly spending for this category
            spent_this_month = calculate_monthly_spending_for_category(user["id"], cat.name, db)
            
            g = goal_map.get(cat.name)
            if g:
                # Use the actual goal and add spending data
                goal_response = BudgetGoalResponse(
                    id=g.id,
                    goal_type=g.goal_type,
                    goal_name=g.goal_name,
                    goal_amount=g.goal_amount,
                    time_period=g.time_period,
                    category_name=g.category_name,
                    created_at=g.created_at,
                    updated_at=g.updated_at,
                    is_active=g.is_active,
                    spent_this_month=spent_this_month,
                    weekly_limit=g.goal_amount  # Map goal_amount to weekly_limit for frontend compatibility
                )
                result.append(goal_response)
            else:
                # Return a default goal object for categories with no goal
                goal_response = BudgetGoalResponse(
                    id=-cat.id,  # negative id to avoid collision
                    goal_type="category",
                    goal_name=f"{cat.name} Budget",
                    goal_amount=0.0,
                    time_period="monthly",
                    category_name=cat.name,
                    created_at=cat.created_at if hasattr(cat, 'created_at') else datetime.utcnow(),
                    updated_at=cat.created_at if hasattr(cat, 'created_at') else datetime.utcnow(),
                    is_active=True,
                    spent_this_month=spent_this_month,
                    weekly_limit=0.0  # Default for categories with no goal
                )
                result.append(goal_response)
        return result
    else:
        query = db.query(Budget_Goals).filter(Budget_Goals.user_id == user["id"], Budget_Goals.is_active == True)
        if goal_type:
            query = query.filter(Budget_Goals.goal_type == goal_type)
        goals = query.all()
        
        # For non-category goals, add spending calculation if needed
        result = []
        for goal in goals:
            spent_amount = 0.0
            if goal.goal_type == "category" and goal.category_name:
                spent_amount = calculate_monthly_spending_for_category(user["id"], goal.category_name, db)
            
            goal_response = BudgetGoalResponse(
                id=goal.id,
                goal_type=goal.goal_type,
                goal_name=goal.goal_name,
                goal_amount=goal.goal_amount,
                time_period=goal.time_period,
                category_name=goal.category_name,
                created_at=goal.created_at,
                updated_at=goal.updated_at,
                is_active=goal.is_active,
                spent_this_month=spent_amount,
                weekly_limit=goal.goal_amount  # Map goal_amount to weekly_limit for frontend compatibility
            )
            result.append(goal_response)
        
        return result

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=BudgetGoalResponse)
async def create_budget_goal(user: Annotated[dict, Depends(get_current_user)], 
                           db: db_dependency, 
                           goal_request: CreateBudgetGoalRequest):
    """Create a new budget goal."""
    
    # Validate goal_type
    if goal_request.goal_type not in ['annual', 'category']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="goal_type must be either 'annual' or 'category'"
        )
    
    # For category goals, ensure category_name is provided
    if goal_request.goal_type == 'category' and not goal_request.category_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="category_name is required for category goals"
        )
    
    # Check if a goal with the same name already exists for this user
    existing_goal = db.query(Budget_Goals).filter(
        Budget_Goals.user_id == user["id"],
        Budget_Goals.goal_name == goal_request.goal_name,
        Budget_Goals.is_active == True
    ).first()
    
    if existing_goal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A goal with this name already exists"
        )
    
    budget_goal_model = Budget_Goals(
        user_id=user["id"],
        goal_type=goal_request.goal_type,
        goal_name=goal_request.goal_name,
        goal_amount=goal_request.goal_amount,
        time_period=goal_request.time_period or ('monthly' if goal_request.goal_type == 'category' else 'yearly'),
        category_name=goal_request.category_name
    )
    
    db.add(budget_goal_model)
    db.commit()
    db.refresh(budget_goal_model)
    
    return budget_goal_model

@router.put("/{goal_id}", response_model=BudgetGoalResponse)
async def update_budget_goal(goal_id: int,
                           user: Annotated[dict, Depends(get_current_user)], 
                           db: db_dependency, 
                           goal_request: UpdateBudgetGoalRequest):
    """Update an existing budget goal."""
    
    goal = db.query(Budget_Goals).filter(
        Budget_Goals.id == goal_id,
        Budget_Goals.user_id == user["id"]
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget goal not found"
        )
    
    # Update fields if provided
    if goal_request.goal_name is not None:
        goal.goal_name = goal_request.goal_name
    if goal_request.goal_amount is not None:
        goal.goal_amount = goal_request.goal_amount
    if goal_request.time_period is not None:
        goal.time_period = goal_request.time_period
    if goal_request.category_name is not None:
        goal.category_name = goal_request.category_name
    if goal_request.is_active is not None:
        goal.is_active = goal_request.is_active
    
    goal.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(goal)
    
    return goal

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget_goal(goal_id: int,
                           user: Annotated[dict, Depends(get_current_user)], 
                           db: db_dependency):
    """Delete a budget goal (soft delete by setting is_active to False)."""
    
    goal = db.query(Budget_Goals).filter(
        Budget_Goals.id == goal_id,
        Budget_Goals.user_id == user["id"]
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget goal not found"
        )
    
    goal.is_active = False
    goal.updated_at = datetime.utcnow()
    
    db.commit()

@router.get("/spending-summary")
async def get_spending_summary(user: Annotated[dict, Depends(get_current_user)], 
                              db: db_dependency):
    """Get monthly spending summary by category for the current user."""
    categories = db.query(User_Categories).filter(User_Categories.user_id == user["id"]).all()
    spending_summary = {}
    
    for category in categories:
        spent_amount = calculate_monthly_spending_for_category(user["id"], category.name, db)
        spending_summary[category.name] = spent_amount
    
    return spending_summary

@router.post("/initialize_defaults", status_code=status.HTTP_201_CREATED)
async def initialize_default_categories(user: Annotated[dict, Depends(get_current_user)], 
                                      db: db_dependency):
    """Initialize default category budget goals for a new user."""
    
    # Check if user already has category goals
    existing_goals = db.query(Budget_Goals).filter(
        Budget_Goals.user_id == user["id"],
        Budget_Goals.goal_type == "category",
        Budget_Goals.is_active == True
    ).count()
    
    if existing_goals > 0:
        return {"message": "User already has category goals"}
    
    # Default categories with reasonable monthly budgets
    default_categories = [
        {"name": "Food & Dining", "amount": 500.0},
        {"name": "Entertainment", "amount": 200.0},
        {"name": "Transportation", "amount": 300.0},
        {"name": "Utilities", "amount": 150.0},
        {"name": "Healthcare", "amount": 100.0},
        {"name": "Shopping", "amount": 250.0},
    ]
    
    goals_created = []
    for category in default_categories:
        budget_goal = Budget_Goals(
            user_id=user["id"],
            goal_type="category",
            goal_name=f"{category['name']} Budget",
            goal_amount=category["amount"],
            time_period="monthly",
            category_name=category["name"]
        )
        db.add(budget_goal)
        goals_created.append(budget_goal)
    
    db.commit()
    
    for goal in goals_created:
        db.refresh(goal)
    
    return {"message": f"Created {len(goals_created)} default category goals", "goals": goals_created}