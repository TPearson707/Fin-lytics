#!/usr/bin/env python3
"""
Script to add recurring transaction columns to the User_Transactions table.
Run this once to update the database schema.
"""

import logging
from sqlalchemy import text
from database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_recurring_columns():
    """Add the new recurring transaction columns to User_Transactions table"""
    
    # SQL statements to add new columns
    columns_to_add = [
        "ALTER TABLE User_Transactions ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE",
        "ALTER TABLE User_Transactions ADD COLUMN frequency_type VARCHAR(20) NULL",
        "ALTER TABLE User_Transactions ADD COLUMN week_day VARCHAR(20) NULL",
        "ALTER TABLE User_Transactions ADD COLUMN month_day INTEGER NULL",
        "ALTER TABLE User_Transactions ADD COLUMN year_month INTEGER NULL", 
        "ALTER TABLE User_Transactions ADD COLUMN year_day INTEGER NULL",
        "ALTER TABLE User_Transactions ADD COLUMN end_date DATE NULL",
        "ALTER TABLE User_Transactions ADD COLUMN parent_transaction_id INTEGER NULL"
    ]
    
    try:
        with engine.connect() as connection:
            for sql in columns_to_add:
                try:
                    logger.info(f"Executing: {sql}")
                    connection.execute(text(sql))
                    connection.commit()
                    logger.info("✓ Column added successfully")
                except Exception as e:
                    if "Duplicate column name" in str(e) or "already exists" in str(e):
                        logger.info("✓ Column already exists, skipping")
                    else:
                        logger.error(f"✗ Error adding column: {e}")
                        
        logger.info("Database migration completed!")
        
    except Exception as e:
        logger.error(f"Database migration failed: {e}")
        raise

if __name__ == "__main__":
    print("Adding recurring transaction columns to database...")
    add_recurring_columns()
    print("Migration complete!")