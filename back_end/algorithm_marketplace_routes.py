from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Request, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from pathlib import Path
from datetime import datetime
import os, uuid, shutil

from database import SessionLocal
from models import Algorithm_Listing, Users, Algorithm_Purchase, Algorithm_Review
from auth import get_current_user
from pydantic import BaseModel

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

    return {"message": "Listing deleted"}
