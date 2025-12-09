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

    if listing.price and listing.price > 0:
        raise HTTPException(501, "Stripe flow not configured on frontend yet")

    purchase = Algorithm_Purchase(
        buyer_id=user["id"],
        listing_id=listing.id,
        purchase_price=0.0,
        payment_status="completed"
    )

    db.add(purchase)
    db.commit()

    return {"message": "Algorithm unlocked"}


@router.get("/{listing_id}/download", status_code=200)
async def download_algorithm(listing_id: int, user: user_dependency, db: db_dependency):

    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()

    if not listing or not listing.file_path or not os.path.exists(listing.file_path):
        raise HTTPException(404, "File missing")

    if listing.price and listing.price > 0:
        if not user or not has_purchased(db, user["id"], listing_id):
            raise HTTPException(403, "Purchase required")

    listing.download_count += 1
    db.commit()

    return FileResponse(listing.file_path, filename=listing.file_name)


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

    return {"message": "Review submitted"}


@router.get("/{listing_id}/reviews", status_code=200)
async def fetch_reviews(listing_id: int, db: db_dependency):
    reviews = (
        db.query(Algorithm_Review)
        .filter(Algorithm_Review.listing_id == listing_id)
        .order_by(Algorithm_Review.created_at.desc())
        .all()
    )

    return [
        {
            "id": r.id,
            "rating": r.rating,
            "comment": r.comment,
            "reviewer": db.query(Users).filter(Users.id == r.reviewer_id).first().username,
            "date": r.created_at,
        }
        for r in reviews
    ]
