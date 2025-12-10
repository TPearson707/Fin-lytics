from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from database import SessionLocal
from models import Algorithm_Listing, Users, Algorithm_Purchase, Algorithm_Review
from auth import get_current_user
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy import func
import os

router = APIRouter(
    prefix='/admin',
    tags=['admin']
)

# ==================== Dependencies ====================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

# ==================== Helper Functions ====================
def check_admin(user: dict, db: Session):
    """Verify that the current user is an admin."""
    user_model = db.query(Users).filter(Users.id == user["id"]).first()
    if not user_model or not user_model.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user_model

# ==================== Schemas ====================
class ApprovalRequest(BaseModel):
    approval_status: str  # "approved" or "rejected"
    rejection_reason: Optional[str] = None

class ListingApprovalResponse(BaseModel):
    id: int
    title: str
    user_id: int
    author_username: str
    approval_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SellerVerificationRequest(BaseModel):
    # user_id: int
    verified: bool

class MarketplaceStats(BaseModel):
    total_listings: int
    pending_approvals: int
    approved_listings: int
    rejected_listings: int
    total_purchases: int
    total_revenue: float
    active_sellers: int
    verified_sellers: int

# ==================== Routes ====================

@router.get("/listings/pending", status_code=status.HTTP_200_OK)
async def get_pending_listings(
    user: user_dependency = None,
    db: db_dependency = None
):
    """Get all listings pending approval (admin only)."""
    check_admin(user, db)
    
    pending_listings = db.query(Algorithm_Listing).filter(
        Algorithm_Listing.approval_status == "pending"
    ).all()
    
    result = []
    for listing in pending_listings:
        author = db.query(Users).filter(Users.id == listing.user_id).first()
        result.append({
            "id": listing.id,
            "title": listing.title,
            "description": listing.description,
            "category": listing.category,
            "price": listing.price,
            "user_id": listing.user_id,
            "author_username": author.username if author else "Unknown",
            "author_email": author.email if author else None,
            "approval_status": listing.approval_status,
            "created_at": listing.created_at,
            "updated_at": listing.updated_at
        })
    
    return result

@router.post("/listings/{listing_id}/approve", status_code=status.HTTP_200_OK)
async def approve_listing(
    listing_id: int,
    approval_request: ApprovalRequest,
    user: user_dependency = None,
    db: db_dependency = None
):
    """Approve or reject a listing (admin only)."""
    admin_user = check_admin(user, db)
    
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if approval_request.approval_status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid approval status. Must be 'approved' or 'rejected'")
    
    listing.approval_status = approval_request.approval_status
    listing.approved_by = admin_user.id
    listing.approved_at = datetime.utcnow()
    
    if approval_request.approval_status == "rejected":
        listing.rejection_reason = approval_request.rejection_reason
        listing.is_active = False
    else:
        listing.rejection_reason = None
        listing.is_active = True
    
    listing.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(listing)
    
    return {
        "message": f"Listing {approval_request.approval_status} successfully",
        "listing_id": listing.id,
        "approval_status": listing.approval_status
    }

@router.get("/listings/all", status_code=status.HTTP_200_OK)
async def get_all_listings(
    skip: int = 0,
    limit: int = 100,
    approval_status: Optional[str] = None,
    user: user_dependency = None,
    db: db_dependency = None
):
    """Get all listings with optional filtering (admin only)."""
    check_admin(user, db)
    
    query = db.query(Algorithm_Listing)
    
    if approval_status:
        query = query.filter(Algorithm_Listing.approval_status == approval_status)
    
    listings = query.offset(skip).limit(limit).all()
    
    result = []
    for listing in listings:
        author = db.query(Users).filter(Users.id == listing.user_id).first()
        approver = db.query(Users).filter(Users.id == listing.approved_by).first() if listing.approved_by else None
        
        result.append({
            "id": listing.id,
            "title": listing.title,
            "description": listing.description,
            "category": listing.category,
            "price": listing.price,
            "user_id": listing.user_id,
            "author_username": author.username if author else "Unknown",
            "approval_status": listing.approval_status,
            "approved_by": listing.approved_by,
            "approver_username": approver.username if approver else None,
            "approved_at": listing.approved_at,
            "rejection_reason": listing.rejection_reason,
            "is_active": listing.is_active,
            "download_count": listing.download_count,
            "rating": listing.rating,
            "created_at": listing.created_at,
            "updated_at": listing.updated_at
        })
    
    return result

@router.post("/sellers/{user_id}/verify", status_code=status.HTTP_200_OK)
async def verify_seller(
    user_id: int,
    verify_request: SellerVerificationRequest,
    user: user_dependency = None,
    db: db_dependency = None
):
    check_admin(user, db)

    seller = db.query(Users).filter(Users.id == user_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="User not found")

    seller.is_seller = not verify_request.verified and seller.is_seller or True
    seller.seller_verified = verify_request.verified

    db.commit()
    db.refresh(seller)

    return {
        "message": f"Seller verification {'granted' if verify_request.verified else 'revoked'}",
        "user_id": seller.id,
        "username": seller.username,
        "seller_verified": seller.seller_verified
    }


@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_marketplace_stats(
    user: user_dependency = None,
    db: db_dependency = None
):
    """Get marketplace statistics (admin only)."""
    check_admin(user, db)
    
    total_listings = db.query(Algorithm_Listing).count()
    pending_approvals = db.query(Algorithm_Listing).filter(
        Algorithm_Listing.approval_status == "pending"
    ).count()
    approved_listings = db.query(Algorithm_Listing).filter(
        Algorithm_Listing.approval_status == "approved"
    ).count()
    rejected_listings = db.query(Algorithm_Listing).filter(
        Algorithm_Listing.approval_status == "rejected"
    ).count()
    
    total_purchases = db.query(Algorithm_Purchase).count()
    
    total_revenue = db.query(func.sum(Algorithm_Purchase.purchase_price)).scalar() or 0.0
    
    active_sellers = db.query(Users).filter(Users.is_seller == True).count()
    verified_sellers = db.query(Users).filter(Users.seller_verified == True).count()
    
    return {
        "total_listings": total_listings,
        "pending_approvals": pending_approvals,
        "approved_listings": approved_listings,
        "rejected_listings": rejected_listings,
        "total_purchases": total_purchases,
        "total_revenue": float(total_revenue),
        "active_sellers": active_sellers,
        "verified_sellers": verified_sellers
    }

@router.post("/users/{user_id}/admin", status_code=status.HTTP_200_OK)
async def toggle_admin_role(
    user_id: int,
    is_admin: bool,
    user: user_dependency = None,
    db: db_dependency = None
):
    """Grant or revoke admin role (admin only)."""
    check_admin(user, db)
    
    target_user = db.query(Users).filter(Users.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot modify your own admin status")
    
    target_user.is_admin = is_admin
    db.commit()
    db.refresh(target_user)
    
    return {
        "message": f"Admin role {'granted' if is_admin else 'revoked'}",
        "user_id": target_user.id,
        "username": target_user.username,
        "is_admin": target_user.is_admin
    }

@router.delete("/listings/{listing_id}", status_code=status.HTTP_200_OK)
async def admin_delete_listing(
    listing_id: int,
    user: user_dependency = None,
    db: db_dependency = None
):
    """Delete any listing (admin only)."""
    check_admin(user, db)
    
    listing = db.query(Algorithm_Listing).filter(Algorithm_Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Delete associated file if it exists
    if listing.file_path and os.path.exists(listing.file_path):
        try:
            os.remove(listing.file_path)
        except Exception as e:
            print(f"Error deleting file {listing.file_path}: {e}")
    
    db.delete(listing)
    db.commit()
    
    return {
        "message": "Listing deleted successfully by admin"
    }

# GIVE PERMS ROUTE FOR DEV
@router.post("/self/promote", status_code=200)
async def promote_self(user: user_dependency, db: db_dependency):
    """TEMPORARY: Promote current user to full seller/admin for dev purposes."""
    usr = db.query(Users).filter(Users.id == user["id"]).first()

    if not usr:
        raise HTTPException(404, "User not found")

    usr.is_admin = True
    usr.is_seller = True
    usr.seller_verified = True

    db.commit()
    db.refresh(usr)

    return {
        "message": "Role promotion complete.",
        "user_id": usr.id,
        "username": usr.username,
        "roles": {
            "admin": usr.is_admin,
            "seller": usr.is_seller,
            "verified_seller": usr.seller_verified,
        }
    }


@router.get("/sellers", status_code=200)
async def get_sellers(user: user_dependency = None, db: db_dependency = None):
    check_admin(user, db)

    sellers = db.query(Users).filter(Users.is_seller == True).all()

    return [
        {
            "id": s.id,
            "username": s.username,
            "email": s.email,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "seller_verified": s.seller_verified,
            # "created_at": s.created_at,
            "is_admin": s.is_admin,
        }
        for s in sellers
    ]

