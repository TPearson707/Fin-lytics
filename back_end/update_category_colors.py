#!/usr/bin/env python3
"""
Script to update existing category colors in the database.
This fixes categories that were created with default green/black colors.
"""

import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User_Categories

def get_category_color(category_name):
    """Get the proper color for a category name"""
    # Normalize the category name (lowercase, replace spaces/underscores with nothing)
    normalized = category_name.lower().replace(' ', '').replace('_', '').replace('and', '')
    
    category_colors = {
        # Food related
        'food': "#D37BFF",
        'fooddrink': '#D37BFF',
        'foodanddrink': '#D37BFF',
        
        # Transportation
        'transportation': "#3E58C9",
        'transport': '#3E58C9',
        'travel': '#3E58C9',
        
        # Utilities & Services
        'utilities': '#45B7D1',
        'generalservices': '#45B7D1',
        'loanpayments': '#DDA0DD',
        'payment': '#DDA0DD',
        
        # Entertainment & Recreation
        'entertainment': '#96CEB4',
        'recreation': '#96CEB4',
        
        # Shopping
        'shopping': '#FFEAA7',
        'shops': '#FFEAA7',
        'generalmerchandise': '#FFEAA7',
        
        # Healthcare & Personal
        'healthcare': '#DDA0DD',
        'personalcare': '#DDA0DD',
        
        # Education
        'education': "#E4B481",
        
        # Financial
        'transfer': '#A0A0A0',
        'transferout': '#A0A0A0',
        'income': '#4CAF50',
        
        # Others
        'other': '#95A5A6',
        'dinosaur': '#FF69B4',  # Special fun color for the dinosaur category! 🦕
        'recurring': '#E17055',
        'subscription': '#E17055',
    }
    
    return category_colors.get(normalized, '#9E9E9E')  # Default gray

def update_category_colors():
    """Update all existing categories with proper colors"""
    db = SessionLocal()
    try:
        # Get all categories
        categories = db.query(User_Categories).all()
        
        print(f"Found {len(categories)} categories to update:")
        
        updated_count = 0
        for category in categories:
            old_color = category.color
            new_color = get_category_color(category.name)
            
            if old_color != new_color:
                category.color = new_color
                updated_count += 1
                print(f"  Updated '{category.name}' (User: {category.user_id}): {old_color} -> {new_color}")
            else:
                print(f"  Kept '{category.name}' (User: {category.user_id}): {old_color} (already correct)")
        
        if updated_count > 0:
            db.commit()
            print(f"\nSuccessfully updated {updated_count} categories!")
        else:
            print("\nNo categories needed updating.")
            
    except Exception as e:
        print(f"Error updating categories: {e}")
        db.rollback()
    finally:
        db.close()

def list_current_colors():
    """List all current category colors"""
    db = SessionLocal()
    try:
        categories = db.query(User_Categories).all()
        
        print("Current category colors:")
        print("-" * 50)
        for category in categories:
            print(f"User {category.user_id}: '{category.name}' -> {category.color}")
            
    except Exception as e:
        print(f"Error listing categories: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "list":
        list_current_colors()
    else:
        print("Category Color Update Script")
        print("=" * 40)
        print("This will update all existing category colors to match the new color scheme.")
        print("\nCurrent categories:")
        list_current_colors()
        
        confirm = input("\nDo you want to update the colors? (y/N): ").strip().lower()
        if confirm == 'y':
            update_category_colors()
        else:
            print("Update cancelled.")