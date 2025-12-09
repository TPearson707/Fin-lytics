from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Request, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from database import SessionLocal
from models import Algorithm_Listing, Users, Algorithm_Purchase, Algorithm_Review
from auth import get_current_user
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy import func, or_, and_
from sqlalchemy.sql import text
import os
import uuid
import shutil
from pathlib import Path
import stripe
from dotenv import load_dotenv

load_dotenv()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_KEY")

router = APIRouter(
    prefix='/algorithms',
    tags=['algorithms']
)

# Directory for storing algorithm files
ALGORITHMS_DIR = Path("back_end/uploaded_algorithms")
ALGORITHMS_DIR.mkdir(parents=True, exist_ok=True)

# ==================== Dependencies ====================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

# ==================== Schemas ====================
class AlgorithmListingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    version: Optional[str] = "1.0.0"

class AlgorithmListingResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str]
    category: Optional[str]
    price: Optional[float]
    file_name: Optional[str]
    file_size: Optional[int]
    version: str
    is_active: bool
    download_count: int
    rating: Optional[float]
    created_at: datetime
    updated_at: datetime
    author_username: str

    class Config:
        from_attributes = True

class AlgorithmListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    version: Optional[str] = None
    is_active: Optional[bool] = None

class PurchaseRequest(BaseModel):
    listing_id: int

class SearchFilters(BaseModel):
    query: Optional[str] = None
    category: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_rating: Optional[float] = None
    sort_by: Optional[str] = "created_at"  # created_at, price, rating, downloads, title
    sort_order: Optional[str] = "desc"  # asc, desc

class ReviewCreate(BaseModel):
    listing_id: int
    rating: int  # 1-5
    comment: Optional[str] = None

class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None

# ==================== Helper Functions ====================
def check_seller(user: dict, db: Session, require_verified: bool = False):
    """Verify that the current user is a seller."""
    user_model = db.query(Users).filter(Users.id == user["id"]).first()
    if not user_model or not user_model.is_seller:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller account required. Please request seller access."
        )
    if require_verified and not user_model.seller_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verified seller account required. Your seller account is pending verification."
        )
    return user_model

def has_purchased(buyer_id: int, listing_id: int, db: Session) -> bool:
    """Check if a user has purchased a listing."""
    purchase = db.query(Algorithm_Purchase).filter(
        Algorithm_Purchase.buyer_id == buyer_id,
        Algorithm_Purchase.listing_id == listing_id
    ).first()
    return purchase is not None

def update_listing_rating(listing_id: int, db: Session):
    """Recalculate and update the average rating for a listing."""
    reviews = db.query(Algorithm_Review).filter(Algorithm_Review.listing_id == listing_id).all()
    if reviews:
        avg_rating = sum(review.rating for review in reviews) / len(reviews)
        listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
        if listing:
            listing.rating = round(avg_rating, 2)
            db.commit()

def get_algorithm_listings(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    category: Optional[str] = None, 
    is_active: Optional[bool] = True, 
    approved_only: bool = True,
    search_query: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc"
):
    """Retrieve algorithm listings with optional filtering, search, and sorting."""
    query = db.query(Algorithm_Listing)
    
    # Only show approved listings to buyers
    if approved_only:
        query = query.filter(Algorithm_Listing.approval_status == "approved")
    
    if is_active is not None:
        query = query.filter(Algorithm_Listing.is_active == is_active)
    
    if category:
        query = query.filter(Algorithm_Listing.category == category)
    
    # Search in title and description
    if search_query:
        search_term = f"%{search_query.lower()}%"
        query = query.filter(
            or_(
                func.lower(Algorithm_Listing.title).like(search_term),
                func.lower(Algorithm_Listing.description).like(search_term)
            )
        )
    
    # Price filters
    if min_price is not None:
        query = query.filter(Algorithm_Listing.price >= min_price)
    if max_price is not None:
        query = query.filter(Algorithm_Listing.price <= max_price)
    
    # Rating filter
    if min_rating is not None:
        query = query.filter(Algorithm_Listing.rating >= min_rating)
    
    # Sorting
    sort_column = None
    if sort_by == "price":
        sort_column = Algorithm_Listing.price
    elif sort_by == "rating":
        sort_column = Algorithm_Listing.rating
    elif sort_by == "downloads":
        sort_column = Algorithm_Listing.download_count
    elif sort_by == "title":
        sort_column = Algorithm_Listing.title
    else:  # default to created_at
        sort_column = Algorithm_Listing.created_at
    
    if sort_order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
    
    listings = query.offset(skip).limit(limit).all()
    
    # Join with Users to get author username
    result = []
    for listing in listings:
        user = db.query(Users).filter(Users.id == listing.user_id).first()
        listing_dict = {
            "id": listing.id,
            "user_id": listing.user_id,
            "title": listing.title,
            "description": listing.description,
            "category": listing.category,
            "price": listing.price,
            "file_name": listing.file_name,
            "file_size": listing.file_size,
            "version": listing.version,
            "is_active": listing.is_active,
            "download_count": listing.download_count,
            "rating": listing.rating,
            "created_at": listing.created_at,
            "updated_at": listing.updated_at,
            "author_username": user.username if user else "Unknown"
        }
        result.append(listing_dict)
    
    return result

def create_algorithm_listing(user: dict, db: Session, listing_data: AlgorithmListingCreate):
    """Create a new algorithm listing."""
    # Check if user is a seller
    user_model = db.query(Users).filter(Users.id == user["id"]).first()
    if not user_model or not user_model.is_seller:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller account required to create listings"
        )
    
    listing = Algorithm_Listing(
        user_id=user["id"],
        title=listing_data.title,
        description=listing_data.description,
        category=listing_data.category,
        price=listing_data.price,
        version=listing_data.version or "1.0.0",
        approval_status="pending"  # New listings require approval
    )
    
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    return listing

def upload_algorithm_file(listing_id: int, user: dict, db: Session, file: UploadFile):
    """Upload and store algorithm file for a listing."""
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Algorithm listing not found")
    
    # Verify ownership
    if listing.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to upload to this listing")
    
    # Generate unique filename to avoid conflicts
    file_extension = Path(file.filename).suffix if file.filename else ""
    unique_filename = f"{listing_id}_{uuid.uuid4().hex}{file_extension}"
    file_path = ALGORITHMS_DIR / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Update listing with file information
        listing.file_path = str(file_path)
        listing.file_name = file.filename
        listing.file_size = file_path.stat().st_size
        listing.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(listing)
        
        return {
            "message": "Algorithm file uploaded successfully",
            "file_name": listing.file_name,
            "file_size": listing.file_size
        }
    except Exception as e:
        # Clean up file if database update fails
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

# ==================== Routes ====================

@router.get("/", status_code=status.HTTP_200_OK, response_model=List[dict])
async def list_algorithms(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    is_active: Optional[bool] = True,
    search_query: Optional[str] = Query(None, description="Search in title and description"),
    min_price: Optional[float] = Query(None, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, description="Maximum price filter"),
    min_rating: Optional[float] = Query(None, description="Minimum rating filter"),
    sort_by: Optional[str] = Query("created_at", description="Sort by: created_at, price, rating, downloads, title"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
    db: db_dependency = None
):
    """Get list of all approved algorithm listings with search and filtering."""
    return get_algorithm_listings(
        db, 
        skip=skip, 
        limit=limit, 
        category=category, 
        is_active=is_active, 
        approved_only=True,
        search_query=search_query,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        sort_by=sort_by,
        sort_order=sort_order
    )

@router.post("/search", status_code=status.HTTP_200_OK, response_model=List[dict])
async def search_algorithms(
    filters: SearchFilters,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = True,
    db: db_dependency = None
):
    """Advanced search for algorithms with filters."""
    return get_algorithm_listings(
        db,
        skip=skip,
        limit=limit,
        category=filters.category,
        is_active=is_active,
        approved_only=True,
        search_query=filters.query,
        min_price=filters.min_price,
        max_price=filters.max_price,
        min_rating=filters.min_rating,
        sort_by=filters.sort_by,
        sort_order=filters.sort_order
    )

@router.get("/{listing_id}", status_code=status.HTTP_200_OK, response_model=dict)
async def get_algorithm(
    listing_id: int,
    user: user_dependency = None,
    db: db_dependency = None
):
    """Get a specific algorithm listing by ID. Increments view count."""
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Algorithm listing not found")
    
    # Increment view count (only for approved listings shown to non-owners)
    user_model = None
    is_owner = False
    if user:
        user_model = db.query(Users).filter(Users.id == user["id"]).first()
        is_owner = listing.user_id == user["id"]
    
    # Only count views for approved listings when viewed by non-owners
    if listing.approval_status == "approved" and not is_owner:
        listing.view_count += 1
        db.commit()
    
    # Check admin status
    is_admin = False
    if user_model:
        is_admin = user_model.is_admin
    
    if not is_owner and not is_admin and listing.approval_status != "approved":
        raise HTTPException(status_code=404, detail="Algorithm listing not found")
    
    author = db.query(Users).filter(Users.id == listing.user_id).first()
    
    # Check if user has purchased (if listing has a price)
    has_purchased_listing = False
    if user and listing.price and listing.price > 0:
        has_purchased_listing = has_purchased(user["id"], listing_id, db)
    
    return {
        "id": listing.id,
        "user_id": listing.user_id,
        "title": listing.title,
        "description": listing.description,
        "category": listing.category,
        "price": listing.price,
        "file_name": listing.file_name,
        "file_size": listing.file_size,
        "version": listing.version,
        "is_active": listing.is_active,
        "download_count": listing.download_count,
        "rating": listing.rating,
        "created_at": listing.created_at,
        "updated_at": listing.updated_at,
        "author_username": author.username if author else "Unknown",
        "has_purchased": has_purchased_listing,
        "is_owner": is_owner
    }

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_listing(
    listing_data: AlgorithmListingCreate,
    user: user_dependency = None,
    db: db_dependency = None
):
    """Create a new algorithm listing."""
    listing = create_algorithm_listing(user, db, listing_data)
    
    return {
        "message": "Algorithm listing created successfully",
        "listing_id": listing.id,
        "title": listing.title
    }

@router.post("/{listing_id}/upload", status_code=status.HTTP_200_OK)
async def upload_algorithm(
    listing_id: int,
    file: UploadFile = File(...),
    user: user_dependency = None,
    db: db_dependency = None
):
    """Upload algorithm file for a listing."""
    return upload_algorithm_file(listing_id, user, db, file)

@router.put("/{listing_id}", status_code=status.HTTP_200_OK)
async def update_listing(
    listing_id: int,
    listing_update: AlgorithmListingUpdate,
    user: user_dependency = None,
    db: db_dependency = None
):
    """Update an algorithm listing (only by owner)."""
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Algorithm listing not found")
    
    # Verify ownership
    if listing.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this listing")
    
    # If significant changes are made, reset approval status to pending
    needs_reapproval = False
    if listing_update.title is not None and listing_update.title != listing.title:
        needs_reapproval = True
    if listing_update.description is not None and listing_update.description != listing.description:
        needs_reapproval = True
    if listing_update.price is not None and listing_update.price != listing.price:
        needs_reapproval = True
    
    # Update fields
    if listing_update.title is not None:
        listing.title = listing_update.title
    if listing_update.description is not None:
        listing.description = listing_update.description
    if listing_update.category is not None:
        listing.category = listing_update.category
    if listing_update.price is not None:
        listing.price = listing_update.price
    if listing_update.version is not None:
        listing.version = listing_update.version
    if listing_update.is_active is not None:
        listing.is_active = listing_update.is_active
    
    # Reset approval if significant changes were made
    if needs_reapproval and listing.approval_status == "approved":
        listing.approval_status = "pending"
        listing.approved_by = None
        listing.approved_at = None
        listing.rejection_reason = None
    
    listing.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(listing)
    
    return {
        "message": "Algorithm listing updated successfully",
        "listing_id": listing.id
    }

@router.delete("/{listing_id}", status_code=status.HTTP_200_OK)
async def delete_listing(
    listing_id: int,
    user: user_dependency = None,
    db: db_dependency = None
):
    """Delete an algorithm listing (only by owner)."""
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Algorithm listing not found")
    
    # Verify ownership
    if listing.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this listing")
    
    # Delete associated file if it exists
    if listing.file_path and os.path.exists(listing.file_path):
        try:
            os.remove(listing.file_path)
        except Exception as e:
            # Log error but continue with database deletion
            print(f"Error deleting file {listing.file_path}: {e}")
    
    db.delete(listing)
    db.commit()
    
    return {
        "message": "Algorithm listing deleted successfully"
    }

@router.post("/purchase", status_code=status.HTTP_201_CREATED)
async def purchase_algorithm(
    purchase_request: PurchaseRequest,
    user: user_dependency = None,
    db: db_dependency = None
):
    """Purchase an algorithm (buyer rule). Creates Stripe checkout session for paid algorithms."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == purchase_request.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Algorithm listing not found")
    
    if listing.approval_status != "approved":
        raise HTTPException(status_code=400, detail="Listing is not approved for purchase")
    
    # Check if already purchased
    existing_purchase = db.query(Algorithm_Purchase).filter(
        Algorithm_Purchase.buyer_id == user["id"],
        Algorithm_Purchase.listing_id == purchase_request.listing_id,
        Algorithm_Purchase.payment_status == "completed"
    ).first()
    
    if existing_purchase:
        raise HTTPException(status_code=400, detail="You have already purchased this algorithm")
    
    user_model = db.query(Users).filter(Users.id == user["id"]).first()
    
    # Free algorithms can be downloaded without purchase tracking
    if not listing.price or listing.price <= 0:
        # Free algorithm - create purchase record for tracking
        purchase = Algorithm_Purchase(
            buyer_id=user["id"],
            listing_id=purchase_request.listing_id,
            purchase_price=0.0,
            payment_status="completed"  # Free items are immediately completed
        )
        db.add(purchase)
        db.commit()
        db.refresh(purchase)
        
        return {
            "message": "Free algorithm added to your library",
            "purchase_id": purchase.id,
            "listing_id": listing.id,
            "payment_status": "completed"
        }
    
    # Paid algorithms require Stripe payment
    if not stripe.api_key:
        raise HTTPException(
            status_code=500,
            detail="Payment processing is not configured. Please contact support."
        )
    
    try:
        # Create Stripe Checkout Session
        checkout_session = stripe.checkout.Session.create(
            customer_email=user_model.email,
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": listing.title,
                        "description": listing.description[:500] if listing.description else "Algorithm purchase",
                    },
                    "unit_amount": int(listing.price * 100),  # Convert to cents
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"http://localhost:5173/algorithms/{listing.id}?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"http://localhost:5173/algorithms/{listing.id}?payment=canceled",
            metadata={
                "user_id": str(user["id"]),
                "listing_id": str(listing.id),
                "purchase_type": "algorithm"
            },
        )
        
        # Create pending purchase record
        purchase = Algorithm_Purchase(
            buyer_id=user["id"],
            listing_id=purchase_request.listing_id,
            purchase_price=listing.price,
            payment_status="pending",
            stripe_checkout_session_id=checkout_session.id
        )
        db.add(purchase)
        db.commit()
        db.refresh(purchase)
        
        return {
            "message": "Checkout session created",
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id,
            "purchase_id": purchase.id,
            "listing_id": listing.id,
            "price": listing.price
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Payment processing error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create checkout session: {str(e)}"
        )

@router.post("/purchase/verify", status_code=status.HTTP_200_OK)
async def verify_purchase(
    session_id: str,
    user: user_dependency = None,
    db: db_dependency = None
):
    """Verify a Stripe payment and complete the purchase."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Payment processing not configured")
    
    try:
        # Retrieve the checkout session from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        
        # Verify the session belongs to this user
        if session.metadata.get("user_id") != str(user["id"]):
            raise HTTPException(status_code=403, detail="This payment does not belong to you")
        
        # Find the purchase record
        purchase = db.query(Algorithm_Purchase).filter(
            Algorithm_Purchase.stripe_checkout_session_id == session_id
        ).first()
        
        if not purchase:
            raise HTTPException(status_code=404, detail="Purchase record not found")
        
        # Update purchase status based on payment status
        if session.payment_status == "paid":
            purchase.payment_status = "completed"
            purchase.stripe_payment_intent_id = session.payment_intent
            db.commit()
            
            return {
                "message": "Purchase verified and completed",
                "purchase_id": purchase.id,
                "payment_status": "completed"
            }
        else:
            purchase.payment_status = "failed"
            db.commit()
            
            return {
                "message": "Payment not completed",
                "payment_status": session.payment_status
            }
            
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying purchase: {str(e)}")

@router.get("/purchases", status_code=status.HTTP_200_OK)
async def get_my_purchases(
    user: user_dependency = None,
    db: db_dependency = None
):
    """Get all algorithms purchased by the current user (buyer rule)."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    purchases = db.query(Algorithm_Purchase).filter(
        Algorithm_Purchase.buyer_id == user["id"]
    ).all()
    
    result = []
    for purchase in purchases:
        listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == purchase.listing_id).first()
        if listing:
            author = db.query(Users).filter(Users.id == listing.user_id).first()
            result.append({
                "purchase_id": purchase.id,
                "listing_id": listing.id,
                "title": listing.title,
                "price": purchase.purchase_price,
                "purchase_date": purchase.purchase_date,
                "download_count": purchase.download_count,
                "author_username": author.username if author else "Unknown"
            })
    
    return result

@router.get("/{listing_id}/download", status_code=status.HTTP_200_OK)
async def download_algorithm(
    listing_id: int,
    user: user_dependency = None,
    db: db_dependency = None
):
    """Download algorithm file (buyer rule - requires purchase for paid algorithms)."""
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Algorithm listing not found")
    
    if listing.approval_status != "approved":
        raise HTTPException(status_code=403, detail="Listing is not approved")
    
    if not listing.file_path or not os.path.exists(listing.file_path):
        raise HTTPException(status_code=404, detail="Algorithm file not found")
    
    # Check if user owns the listing (sellers can download their own)
    is_owner = False
    if user:
        is_owner = listing.user_id == user["id"]
    
    # For paid algorithms, require purchase
    if listing.price and listing.price > 0 and not is_owner:
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if not has_purchased(user["id"], listing_id, db):
            raise HTTPException(
                status_code=403,
                detail="You must purchase this algorithm before downloading"
            )
        
        # Increment user's download count for this purchase
        purchase = db.query(Algorithm_Purchase).filter(
            Algorithm_Purchase.buyer_id == user["id"],
            Algorithm_Purchase.listing_id == listing_id
        ).first()
        if purchase:
            purchase.download_count += 1
            db.commit()
    
    # Increment global download count
    listing.download_count += 1
    db.commit()
    
    return FileResponse(
        path=listing.file_path,
        filename=listing.file_name or f"algorithm_{listing_id}",
        media_type='application/octet-stream'
    )

@router.post("/reviews", status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreate,
    user: user_dependency = None,
    db: db_dependency = None
):
    """Create a review for an algorithm (buyer rule - requires purchase)."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == review_data.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Algorithm listing not found")
    
    # Check if user has purchased (required for reviews)
    if not has_purchased(user["id"], review_data.listing_id, db):
        raise HTTPException(
            status_code=403,
            detail="You must purchase this algorithm before reviewing"
        )
    
    # Check if user already reviewed
    existing_review = db.query(Algorithm_Review).filter(
        Algorithm_Review.listing_id == review_data.listing_id,
        Algorithm_Review.reviewer_id == user["id"]
    ).first()
    
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this algorithm")
    
    if review_data.rating < 1 or review_data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    review = Algorithm_Review(
        listing_id=review_data.listing_id,
        reviewer_id=user["id"],
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    db.add(review)
    db.commit()
    db.refresh(review)
    
    # Update listing rating
    update_listing_rating(review_data.listing_id, db)
    
    return {
        "message": "Review created successfully",
        "review_id": review.id
    }

@router.get("/{listing_id}/reviews", status_code=status.HTTP_200_OK)
async def get_listing_reviews(
    listing_id: int,
    db: db_dependency = None
):
    """Get all reviews for a listing."""
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Algorithm listing not found")
    
    reviews = db.query(Algorithm_Review).filter(
        Algorithm_Review.listing_id == listing_id
    ).order_by(Algorithm_Review.created_at.desc()).all()
    
    result = []
    for review in reviews:
        reviewer = db.query(Users).filter(Users.id == review.reviewer_id).first()
        result.append({
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "reviewer_username": reviewer.username if reviewer else "Unknown",
            "created_at": review.created_at,
            "updated_at": review.updated_at
        })
    
    return result

@router.get("/seller/stats", status_code=status.HTTP_200_OK)
async def get_seller_stats(
    user: user_dependency = None,
    db: db_dependency = None
):
    """Get seller statistics (seller rule)."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    check_seller(user, db)
    
    # Get all listings by this seller
    listings = db.query(Algorithm_Listing).filter(Algorithm_Listing.user_id == user["id"]).all()
    
    total_listings = len(listings)
    approved_listings = sum(1 for l in listings if l.approval_status == "approved")
    pending_listings = sum(1 for l in listings if l.approval_status == "pending")
    rejected_listings = sum(1 for l in listings if l.approval_status == "rejected")
    
    # Get total purchases and revenue
    total_purchases = 0
    total_revenue = 0.0
    total_downloads = 0
    
    for listing in listings:
        purchases = db.query(Algorithm_Purchase).filter(
            Algorithm_Purchase.listing_id == listing.id
        ).all()
        total_purchases += len(purchases)
        total_revenue += sum(p.purchase_price or 0 for p in purchases)
        total_downloads += listing.download_count
    
    return {
        "total_listings": total_listings,
        "approved_listings": approved_listings,
        "pending_listings": pending_listings,
        "rejected_listings": rejected_listings,
        "total_purchases": total_purchases,
        "total_revenue": float(total_revenue),
        "total_downloads": total_downloads
    }

@router.get("/seller/listings", status_code=status.HTTP_200_OK)
async def get_my_listings(
    user: user_dependency = None,
    db: db_dependency = None
):
    """Get all listings created by the current seller (seller rule)."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    check_seller(user, db)
    
    listings = db.query(Algorithm_Listing).filter(
        Algorithm_Listing.user_id == user["id"]
    ).order_by(Algorithm_Listing.created_at.desc()).all()
    
    result = []
    for listing in listings:
        # Get purchase count for this listing
        purchase_count = db.query(Algorithm_Purchase).filter(
            Algorithm_Purchase.listing_id == listing.id
        ).count()
        
        result.append({
            "id": listing.id,
            "title": listing.title,
            "description": listing.description,
            "category": listing.category,
            "price": listing.price,
            "approval_status": listing.approval_status,
            "rejection_reason": listing.rejection_reason,
            "is_active": listing.is_active,
            "download_count": listing.download_count,
            "purchase_count": purchase_count,
            "rating": listing.rating,
            "created_at": listing.created_at,
            "updated_at": listing.updated_at
        })
    
    return result

@router.post("/seller/request", status_code=status.HTTP_200_OK)
async def request_seller_access(
    user: user_dependency = None,
    db: db_dependency = None
):
    """Request seller account access."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user_model = db.query(Users).filter(Users.id == user["id"]).first()
    if not user_model:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_model.is_seller:
        return {
            "message": "You already have seller access",
            "is_seller": True,
            "seller_verified": user_model.seller_verified
        }
    
    # Enable seller role (admin can verify later)
    user_model.is_seller = True
    user_model.seller_verified = False  # Requires admin verification
    db.commit()
    db.refresh(user_model)
    
    return {
        "message": "Seller access requested. Your account is pending verification by an admin.",
        "is_seller": True,
        "seller_verified": False
    }

@router.post("/webhook/stripe", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature")
):
    """Handle Stripe webhook events for algorithm purchases."""
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")
    
    db = SessionLocal()
    try:
        # Get raw body as bytes (important for signature verification)
        body = await request.body()
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                body,
                stripe_signature,
                webhook_secret
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid payload: {str(e)}")
        except stripe.error.SignatureVerificationError as e:
            raise HTTPException(status_code=400, detail=f"Invalid signature: {str(e)}")
        
        # Handle the event
        event_type = event["type"]
        data = event["data"]["object"]
        
        if event_type == "checkout.session.completed":
            session = data
            session_id = session.get("id")
            
            # Find the purchase record
            purchase = db.query(Algorithm_Purchase).filter(
                Algorithm_Purchase.stripe_checkout_session_id == session_id
            ).first()
            
            if purchase and session.get("payment_status") == "paid":
                purchase.payment_status = "completed"
                purchase.stripe_payment_intent_id = session.get("payment_intent")
                db.commit()
        
        elif event_type == "payment_intent.succeeded":
            payment_intent = data
            payment_intent_id = payment_intent.get("id")
            
            # Find purchase by payment intent
            purchase = db.query(Algorithm_Purchase).filter(
                Algorithm_Purchase.stripe_payment_intent_id == payment_intent_id
            ).first()
            
            if purchase:
                purchase.payment_status = "completed"
                db.commit()
        
        elif event_type == "payment_intent.payment_failed":
            payment_intent = data
            payment_intent_id = payment_intent.get("id")
            
            # Find purchase by payment intent
            purchase = db.query(Algorithm_Purchase).filter(
                Algorithm_Purchase.stripe_payment_intent_id == payment_intent_id
            ).first()
            
            if purchase:
                purchase.payment_status = "failed"
                db.commit()
        
        return {"status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")
    finally:
        db.close()
