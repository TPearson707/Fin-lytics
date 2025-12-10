from fastapi import (
    APIRouter, Depends, HTTPException, status, UploadFile, File,
    Query, Request, Header
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pathlib import Path
from datetime import datetime
from typing import Annotated, Optional

import os
import uuid
import shutil
import stripe

from database import SessionLocal
from models import Algorithm_Listing, Users, Algorithm_Purchase, Algorithm_Review
from auth import get_current_user
from pydantic import BaseModel
from dotenv import load_dotenv


load_dotenv()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_KEY")

load_dotenv()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_KEY")

# ==========================================================
#   Router Setup
# ==========================================================

router = APIRouter(prefix="/algorithms", tags=["algorithms"])

ALGORITHMS_DIR = Path("back_end/uploaded_algorithms")
ALGORITHMS_DIR.mkdir(parents=True, exist_ok=True)

# ==========================================================
#   Dependencies
# ==========================================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

# ==========================================================
#   Schemas
# ==========================================================

class AlgorithmListingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    version: Optional[str] = "1.0.0"

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
    sort_by: Optional[str] = "created_at"
    sort_order: Optional[str] = "desc"

class ReviewCreate(BaseModel):
    listing_id: int
    rating: int
    comment: Optional[str] = None

class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None


# ==========================================================
#   Helper Logic
# ==========================================================

def check_seller(user: dict, db: Session):
    seller = db.query(Users).filter(Users.id == user["id"]).first()
    if not seller or not seller.is_seller:
        raise HTTPException(403, "Seller permissions required")
    return seller

def has_purchased(db: Session, buyer_id: int, listing_id: int):
    # Owner always counts as purchased
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    if listing and listing.user_id == buyer_id:
        return True

    # Otherwise check purchase record
    return db.query(Algorithm_Purchase).filter(
        Algorithm_Purchase.buyer_id == buyer_id,
        Algorithm_Purchase.listing_id == listing_id,
        Algorithm_Purchase.payment_status == "completed"
    ).first() is not None



# ==========================================================
#   PUBLIC ROUTES
# ==========================================================

@router.get("/marketplace", status_code=200)
async def marketplace_listing(
    page: int = 1,
    limit: int = 9,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    db: db_dependency = None
):
    """Public marketplace listing with pagination."""
    query = db.query(Algorithm_Listing).filter(Algorithm_Listing.is_active == True)

    if search:
        query = query.filter(Algorithm_Listing.title.ilike(f"%{search}%"))

    ordering = {
        "new": Algorithm_Listing.created_at.desc(),
        "price_low": Algorithm_Listing.price.asc(),
        "price_high": Algorithm_Listing.price.desc(),
        "rating": Algorithm_Listing.rating.desc()
    }.get(sort_by, Algorithm_Listing.download_count.desc())

    query = query.order_by(ordering)

    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "items": [
            {
                "id": item.id,
                "name": item.title,
                "description": item.description,
                "creator": db.query(Users).filter(Users.id == item.user_id).first().username,
                "tags": item.category.split(",") if item.category else [],
                "price": item.price,
                "rating": item.rating,
                "num_reviews": db.query(Algorithm_Review)
                               .filter(Algorithm_Review.listing_id == item.id)
                               .count(), 
                "updated_at": item.updated_at,
            }
            for item in items
        ],
        "total_pages": max((total + limit - 1) // limit, 1)
    }


@router.get("/{listing_id}", status_code=200)
async def get_algorithm(listing_id: int, user: user_dependency = None, db: db_dependency = None):
    """Retrieve single algorithm details."""
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(404, "Listing not found")

    owner = user and user["id"] == listing.user_id
    purchased = user and has_purchased(db, user["id"], listing_id)

    return {
        **listing.__dict__,
        "author_username": db.query(Users).filter(Users.id == listing.user_id).first().username,
        "is_owner": owner,
        "has_purchased": purchased
    }


# ==========================================================
#   SELLER ROUTES
# ==========================================================

@router.post("/", status_code=201)
async def create_listing(payload: AlgorithmListingCreate, user: user_dependency, db: db_dependency):
    check_seller(user, db)

    listing = Algorithm_Listing(
        user_id=user["id"],
        title=payload.title,
        description=payload.description,
        category=payload.category,
        price=payload.price,
        version=payload.version,
        approval_status="pending"
    )

    db.add(listing)
    db.commit()
    db.refresh(listing)

    return {"message": "Listing created", "id": listing.id}

@router.delete("/{listing_id}", status_code=200)
async def delete_listing(
    listing_id: int,
    user: user_dependency,
    db: db_dependency
):
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()

    if not listing:
        raise HTTPException(404, "Listing not found")

    if listing.user_id != user["id"]:
        raise HTTPException(403, "Not authorized")

    # Delete file if exists
    if listing.file_path and os.path.exists(listing.file_path):
        try:
            os.remove(listing.file_path)
        except:
            pass  # avoid breaking delete if file is already gone

    # Delete purchases
    db.query(Algorithm_Purchase).filter(
        Algorithm_Purchase.listing_id == listing_id
    ).delete()

    # Delete reviews
    db.query(Algorithm_Review).filter(
        Algorithm_Review.listing_id == listing_id
    ).delete()

    # Remove listing
    db.delete(listing)
    db.commit()

    return {"message": "Listing deleted"}


@router.put("/{listing_id}", status_code=200)
async def update_listing(listing_id: int, payload: AlgorithmListingUpdate, user: user_dependency, db: db_dependency):
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(404, "Not found")
    if listing.user_id != user["id"]:
        raise HTTPException(403, "Unauthorized")

    for key, value in payload.dict(exclude_none=True).items():
        setattr(listing, key, value)

    listing.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Listing updated"}


@router.post("/{listing_id}/upload", status_code=200)
async def upload_file(listing_id: int, file: UploadFile = File(...), user: user_dependency = None, db: db_dependency = None):

    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()

    if not listing:
        raise HTTPException(404, "Listing not found")
    if listing.user_id != user["id"]:
        raise HTTPException(403, "Not authorized")

    ext = Path(file.filename).suffix
    unique_file = f"{listing_id}_{uuid.uuid4().hex}{ext}"
    path = ALGORITHMS_DIR / unique_file

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    listing.file_name = file.filename
    listing.file_path = str(path)
    listing.file_size = path.stat().st_size
    listing.updated_at = datetime.utcnow()

    db.commit()

    return {"message": "File uploaded", "filename": file.filename}


# ==========================================================
#   DOWNLOAD + PURCHASE SYSTEM
# ==========================================================

@router.post("/purchase", status_code=201)
async def purchase_algorithm(payload: PurchaseRequest, user: user_dependency, db: db_dependency):
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == payload.listing_id).first()
    if not listing:
        raise HTTPException(404, "Listing not found")

    # Prevent buying your own listing
    if listing.user_id == user["id"]:
        return {"message": "You already own this listing"}

    # If already purchased, don't duplicate rows
    if has_purchased(db, user["id"], payload.listing_id):
        return {"message": "Already purchased"}

    # (Stripe logic later — free purchase for now)
    purchase = Algorithm_Purchase(
        buyer_id=user["id"],
        listing_id=listing.id,
        purchase_price=listing.price or 0.0,
        payment_status="completed"
    )

    db.add(purchase)
    db.commit()

    return {"message": "Algorithm unlocked"}



@router.get("/{listing_id}/download", status_code=200)
async def download_algorithm(
    listing_id: int,
    user: user_dependency,
    db: db_dependency
):
    listing = db.query(Algorithm_Listing).filter(
        Algorithm_Listing.id == listing_id
    ).first()

    if not listing:
        raise HTTPException(404, "Listing not found")

    if not listing.file_path or not os.path.exists(listing.file_path):
        raise HTTPException(404, "File missing or not uploaded yet")

    # ---- Check permissions ----
    is_owner = user and user["id"] == listing.user_id
    has_access = user and has_purchased(db, user["id"], listing_id)

    # If the listing has a price and the requester isn't the owner or a buyer
    if listing.price and listing.price > 0 and not (is_owner or has_access):
        raise HTTPException(403, "Purchase required")

    # ---- Count download ----
    listing.download_count += 1
    db.commit()

    return FileResponse(
        listing.file_path,
        filename=listing.file_name,
        media_type="application/octet-stream"
    )



# ==========================================================
#   REVIEWS
# ==========================================================

@router.post("/reviews", status_code=201)
async def create_review(payload: ReviewCreate, user: user_dependency, db: db_dependency):

    if not has_purchased(db, user["id"], payload.listing_id):
        raise HTTPException(403, "Purchase required before reviewing")

    review = Algorithm_Review(
        reviewer_id=user["id"],
        listing_id=payload.listing_id,
        rating=payload.rating,
        comment=payload.comment
    )

    db.add(review)
    db.commit()

    # --- NEW: Update aggregate rating on listing ---
    avg_rating = db.query(func.avg(Algorithm_Review.rating)).filter(
        Algorithm_Review.listing_id == payload.listing_id
    ).scalar()

    listing = db.query(Algorithm_Listing).filter(
        Algorithm_Listing.id == payload.listing_id
    ).first()

    listing.rating = round(float(avg_rating or 0), 2)
    db.commit()

    return {"message": "Review submitted", "updated_rating": listing.rating}


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

@router.post("/payment/check-status", status_code=status.HTTP_200_OK)
async def check_payment_status(
    session_id: Optional[str] = Query(None),
    payment_intent_id: Optional[str] = Query(None),
    user: user_dependency = None,
    db: db_dependency = None
):
    """Check and update payment status by querying Stripe directly (no webhooks needed)."""
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Payment processing not configured")
    
    if not session_id and not payment_intent_id:
        raise HTTPException(
            status_code=400, 
            detail="Either session_id or payment_intent_id must be provided"
        )
    
    try:
        purchase = None
        
        # If session_id provided, check checkout session
        if session_id:
            # Find purchase record
            purchase = db.query(Algorithm_Purchase).filter(
                Algorithm_Purchase.stripe_checkout_session_id == session_id
            ).first()
            
            if not purchase:
                raise HTTPException(status_code=404, detail="Purchase record not found")
            
            # Verify it belongs to the user (if authenticated)
            if user and purchase.buyer_id != user["id"]:
                raise HTTPException(status_code=403, detail="This purchase does not belong to you")
            
            # Retrieve session from Stripe
            session = stripe.checkout.Session.retrieve(session_id)
            
            # Update purchase status based on Stripe session status
            if session.payment_status == "paid":
                purchase.payment_status = "completed"
                if session.payment_intent:
                    purchase.stripe_payment_intent_id = session.payment_intent
                db.commit()
                return {
                    "status": "success",
                    "payment_status": "completed",
                    "purchase_id": purchase.id,
                    "message": "Payment completed successfully"
                }
            elif session.payment_status == "unpaid":
                purchase.payment_status = "pending"
                db.commit()
                return {
                    "status": "pending",
                    "payment_status": "pending",
                    "purchase_id": purchase.id,
                    "message": "Payment is still pending"
                }
            else:
                purchase.payment_status = "failed"
                db.commit()
                return {
                    "status": "failed",
                    "payment_status": session.payment_status,
                    "purchase_id": purchase.id,
                    "message": f"Payment status: {session.payment_status}"
                }
        
        # If payment_intent_id provided, check payment intent
        elif payment_intent_id:
            # Find purchase record
            purchase = db.query(Algorithm_Purchase).filter(
                Algorithm_Purchase.stripe_payment_intent_id == payment_intent_id
            ).first()
            
            if not purchase:
                raise HTTPException(status_code=404, detail="Purchase record not found")
            
            # Verify it belongs to the user (if authenticated)
            if user and purchase.buyer_id != user["id"]:
                raise HTTPException(status_code=403, detail="This purchase does not belong to you")
            
            # Retrieve payment intent from Stripe
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            # Update purchase status based on Stripe payment intent status
            if payment_intent.status == "succeeded":
                purchase.payment_status = "completed"
                db.commit()
                return {
                    "status": "success",
                    "payment_status": "completed",
                    "purchase_id": purchase.id,
                    "message": "Payment completed successfully"
                }
            elif payment_intent.status == "processing":
                purchase.payment_status = "processing"
                db.commit()
                return {
                    "status": "processing",
                    "payment_status": "processing",
                    "purchase_id": purchase.id,
                    "message": "Payment is being processed"
                }
            elif payment_intent.status == "requires_payment_method":
                purchase.payment_status = "failed"
                db.commit()
                return {
                    "status": "failed",
                    "payment_status": "failed",
                    "purchase_id": purchase.id,
                    "message": "Payment requires a payment method"
                }
            else:
                purchase.payment_status = "failed"
                db.commit()
                return {
                    "status": "failed",
                    "payment_status": payment_intent.status,
                    "purchase_id": purchase.id,
                    "message": f"Payment status: {payment_intent.status}"
                }
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check payment status: {str(e)}")