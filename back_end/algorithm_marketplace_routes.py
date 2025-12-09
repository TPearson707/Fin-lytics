from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Request, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from pathlib import Path
from datetime import datetime
import os, uuid, shutil
import stripe
from dotenv import load_dotenv

from database import SessionLocal
from models import Algorithm_Listing, Users, Algorithm_Purchase, Algorithm_Review
from auth import get_current_user
from pydantic import BaseModel

load_dotenv()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_KEY")

# ==========================================================
#   Router Setup
# ==========================================================

router = APIRouter(prefix="/algorithms", tags=["algorithms"])

# Directory to store uploads
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


# ==========================================================
#   Helper Functions
# ==========================================================

def create_algorithm_listing(user: dict, db: Session, listing_data: AlgorithmListingCreate):
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


# ==========================================================
#   ROUTES (ORDER MATTERS!)
# ==========================================================

# --------- 1. List all algorithms (INTERNAL) ----------
@router.get("/", status_code=200)
async def list_algorithms(skip: int = 0, limit: int = 100, db: db_dependency = None):
    return db.query(Algorithm_Listing).offset(skip).limit(limit).all()


# --------- 2. Marketplace (PUBLIC) ----------
@router.get("/marketplace", status_code=200)
async def marketplace_listing(
    page: int = 1,
    limit: int = 9,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    db: db_dependency = None
):
    """Paginated + searchable marketplace listing"""

    query = db.query(Algorithm_Listing).filter(Algorithm_Listing.is_active == True)

    # Search
    if search:
        query = query.filter(Algorithm_Listing.title.ilike(f"%{search}%"))

    # Sort
    if sort_by == "new":
        query = query.order_by(Algorithm_Listing.created_at.desc())
    elif sort_by == "price_low":
        query = query.order_by(Algorithm_Listing.price.asc())
    elif sort_by == "price_high":
        query = query.order_by(Algorithm_Listing.price.desc())
    elif sort_by == "rating":
        query = query.order_by(Algorithm_Listing.rating.desc())
    else:
        # Default sort by popularity
        query = query.order_by(Algorithm_Listing.download_count.desc())

    total_count = query.count()
    total_pages = max((total_count + limit - 1) // limit, 1)

    listings = query.offset((page - 1) * limit).limit(limit).all()

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
                "num_reviews": 0,
                "updated_at": item.updated_at,
            }
            for item in listings
        ],
        "total_pages": total_pages
    }


# --------- 3. Create new algorithm listing ----------
@router.post("/", status_code=201)
async def create_listing(listing_data: AlgorithmListingCreate, user: user_dependency, db: db_dependency):
    listing = create_algorithm_listing(user, db, listing_data)
    return {"message": "Listing created", "listing_id": listing.id}


# --------- 4. Upload a file to a listing (OWNER ONLY) ----------
@router.post("/{listing_id}/upload", status_code=200)
async def upload_algorithm(listing_id: int, file: UploadFile = File(...), user: user_dependency = None, db: db_dependency = None):

    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(404, "Listing not found")

    if listing.user_id != user["id"]:
        raise HTTPException(403, "Not authorized")

    ext = Path(file.filename).suffix
    unique_name = f"{listing_id}_{uuid.uuid4().hex}{ext}"
    path = ALGORITHMS_DIR / unique_name

    try:
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        listing.file_path = str(path)
        listing.file_name = file.filename
        listing.file_size = path.stat().st_size
        listing.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(listing)

        return {"message": "File uploaded", "file_name": listing.file_name}

    except:
        if path.exists():
            path.unlink()
        raise HTTPException(500, "Upload failed")


# --------- 5. Get single listing ----------
@router.get("/{listing_id}", status_code=200)
async def get_algorithm(listing_id: int, db: db_dependency):
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(404, "Algorithm not found")

    user = db.query(Users).filter(Users.id == listing.user_id).first()

    return {**listing.__dict__, "author_username": user.username if user else "Unknown"}


# --------- 6. Download file ----------
@router.get("/{listing_id}/download", status_code=200)
async def download_algorithm(listing_id: int, db: db_dependency):
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    if not listing or not listing.file_path or not os.path.exists(listing.file_path):
        raise HTTPException(404, "File not found")

    listing.download_count += 1
    db.commit()

    return FileResponse(path=listing.file_path, filename=listing.file_name)


# --------- 7. Edit listing ----------
@router.put("/{listing_id}", status_code=200)
async def update_listing(listing_id: int, update: AlgorithmListingUpdate, user: user_dependency, db: db_dependency):
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()

    if not listing:
        raise HTTPException(404, "Listing not found")
    if listing.user_id != user["id"]:
        raise HTTPException(403, "Unauthorized")

    for key, value in update.dict(exclude_none=True).items():
        setattr(listing, key, value)

    listing.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Listing updated"}


# --------- 8. Delete listing ----------
@router.delete("/{listing_id}", status_code=200)
async def delete_listing(listing_id: int, user: user_dependency, db: db_dependency):
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()

    if not listing:
        raise HTTPException(404, "Listing not found")
    if listing.user_id != user["id"]:
        raise HTTPException(403, "Unauthorized")

    if listing.file_path and os.path.exists(listing.file_path):
        os.remove(listing.file_path)

    db.delete(listing)
    db.commit()

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
