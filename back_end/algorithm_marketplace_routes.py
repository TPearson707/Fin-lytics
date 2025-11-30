from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from database import SessionLocal
from models import Algorithm_Listing, Users
from auth import get_current_user
from pydantic import BaseModel
from datetime import datetime
import os
import uuid
import shutil
from pathlib import Path

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

# ==================== Helper Functions ====================
def get_algorithm_listings(db: Session, skip: int = 0, limit: int = 100, category: Optional[str] = None, is_active: Optional[bool] = True):
    """Retrieve algorithm listings with optional filtering."""
    query = db.query(Algorithm_Listing)
    
    if is_active is not None:
        query = query.filter(Algorithm_Listing.is_active == is_active)
    
    if category:
        query = query.filter(Algorithm_Listing.category == category)
    
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
    listing = Algorithm_Listing(
        user_id=user["id"],
        title=listing_data.title,
        description=listing_data.description,
        category=listing_data.category,
        price=listing_data.price,
        version=listing_data.version or "1.0.0"
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
    db: db_dependency = None
):
    """Get list of all algorithm listings."""
    return get_algorithm_listings(db, skip=skip, limit=limit, category=category, is_active=is_active)

@router.get("/{listing_id}", status_code=status.HTTP_200_OK, response_model=dict)
async def get_algorithm(
    listing_id: int,
    db: db_dependency = None
):
    """Get a specific algorithm listing by ID."""
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Algorithm listing not found")
    
    user = db.query(Users).filter(Users.id == listing.user_id).first()
    
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
        "author_username": user.username if user else "Unknown"
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

@router.get("/{listing_id}/download", status_code=status.HTTP_200_OK)
async def download_algorithm(
    listing_id: int,
    db: db_dependency = None
):
    """Download algorithm file (increments download count)."""
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Algorithm listing not found")
    
    if not listing.file_path or not os.path.exists(listing.file_path):
        raise HTTPException(status_code=404, detail="Algorithm file not found")
    
    # Increment download count
    listing.download_count += 1
    db.commit()
    
    return FileResponse(
        path=listing.file_path,
        filename=listing.file_name or f"algorithm_{listing_id}",
        media_type='application/octet-stream'
    )

