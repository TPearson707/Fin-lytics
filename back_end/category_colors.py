"""
Utility functions for category color management
"""

def get_category_color(category_name):
    """
    Get the proper color for a category name.
    Handles various naming conventions (uppercase, lowercase, spaces, underscores).
    """
    # Normalize the category name (lowercase, remove spaces/underscores)
    normalized = category_name.lower().replace(' ', '').replace('_', '').replace('and', '')
    
    category_colors = {
        # Food related
        'food': '#FF6B6B',
        'fooddrink': '#FF6B6B',
        'foodanddrink': '#FF6B6B',
        
        # Transportation
        'transportation': '#4ECDC4',
        'transport': '#4ECDC4',
        'travel': '#F7DC6F',
        
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
        'education': '#98D8C8',
        
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