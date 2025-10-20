from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, Date, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Users(Base):
    __tablename__ = "Users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(255), unique=True, nullable=False)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    phone_number = Column(String(20), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    plaid_access_token = Column(String(255), unique=True, nullable=True)
    plaid_brokerage_access_token = Column(String(255), unique=True, nullable=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True)
    bank_accounts = relationship(
        "Plaid_Bank_Account",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    categories = relationship(
        "User_Categories",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    investments = relationship(
        "Plaid_Investment",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    save_goals = relationship(
        "Save_Goals",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    balances = relationship(
        "User_Balance",
        back_populates="user",
        cascade="all, delete-orphan"
    )


class Settings(Base):
    __tablename__ = "Settings"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), unique=True, nullable=False)
    email_notifications = Column(Boolean, default=False)
    sms_notifications = Column(Boolean, default=False)
    push_notifications = Column(Boolean, default=False)


class Plaid_Bank_Account(Base):
    __tablename__ = "Plaid_Bank_Account"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(255))
    type = Column(String(50))
    subtype = Column(String(50))
    current_balance = Column(Float)
    available_balance = Column(Float)
    currency = Column(String(10))
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("Users", back_populates="bank_accounts")
    transactions = relationship(
        "Plaid_Transactions",
        back_populates="bank_account",
        cascade="all, delete-orphan"
    )


class Plaid_Transactions(Base):
    __tablename__ = "Plaid_Transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(50), unique=True)
    account_id = Column(
        String(100),
        ForeignKey("Plaid_Bank_Account.account_id", ondelete="CASCADE"),
        nullable=False
    )
    amount = Column(Float)
    currency = Column(String(10))
    category = Column(String(100))
    merchant_name = Column(String(255))
    date = Column(Date)
    frequency = Column(String(20), nullable=True)  # For recurring transactions: 'weekly', 'monthly', etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    bank_account = relationship("Plaid_Bank_Account", back_populates="transactions")
    transaction_categories = relationship(
        "Transaction_Category_Link",
        back_populates="transaction",
        cascade="all, delete-orphan"
    )


class User_Categories(Base):
    __tablename__ = "User_Categories"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    color = Column(String(7), nullable=False)
    weekly_limit = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("Users", back_populates="categories")
    transaction_links = relationship(
        "Transaction_Category_Link",
        back_populates="category",
        cascade="all, delete-orphan"
    )
    user_transaction_links = relationship(
     "User_Transaction_Category_Link",
     back_populates="category",
     cascade="all, delete-orphan"
    )
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='_user_name_uc'),
    )


class Transaction_Category_Link(Base):
    __tablename__ = "Transaction_Category_Link"

    id = Column(Integer, primary_key=True)
    transaction_id = Column(String(50), ForeignKey("Plaid_Transactions.transaction_id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("User_Categories.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    transaction = relationship("Plaid_Transactions", back_populates="transaction_categories")
    category = relationship("User_Categories", back_populates="transaction_links")
    __table_args__ = (
        UniqueConstraint('transaction_id', name='_transaction_id_uc'),
    )


class Plaid_Investment(Base):
    __tablename__ = "Plaid_Investment"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(255))
    type = Column(String(50))
    subtype = Column(String(50))
    current_balance = Column(Float)
    available_balance = Column(Float)
    currency = Column(String(10))
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("Users", back_populates="investments")
    holdings = relationship(
        "Plaid_Investment_Holding",
        back_populates="investment_account",
        cascade="all, delete-orphan"
    )


class Plaid_Investment_Holding(Base):
    __tablename__ = "Plaid_Investment_Holding"

    id = Column(Integer, primary_key=True, index=True)
    holding_id = Column(String(100), unique=True, nullable=False)
    account_id = Column(
        String(100),
        ForeignKey("Plaid_Investment.account_id", ondelete="CASCADE"),
        nullable=False
    )
    security_id = Column(String(100))
    symbol = Column(String(20))
    name = Column(String(255))
    quantity = Column(Float)
    price = Column(Float)
    value = Column(Float)
    currency = Column(String(10))
    created_at = Column(DateTime, default=datetime.utcnow)
    investment_account = relationship("Plaid_Investment", back_populates="holdings")

class Save_Goals(Base):
    __tablename__ = "Save_Goals"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    goal_name = Column(String(100), nullable=False)
    goal_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    goal_date = Column(Date, nullable=False)
    goal_status = Column(String(50), default="Active")
    user_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)

    user = relationship("Users", back_populates="save_goals")

    def __repr__(self):
        return f"<Save_Goals(goal_id={self.goal_id}, goal_name={self.goal_name}, user_id={self.user_id})>"

class User_Balance(Base):
    __tablename__ = "User_Balance"

    balance_id = Column(Integer, primary_key=True, index=True)
    id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    balance_name = Column(String(50), nullable=False) 
    balance_amount = Column(Float, default=0.0)
    previous_balance = Column(Float, default=0.0)
    balance_date = Column(DateTime, default=datetime.utcnow)

    user = relationship("Users", back_populates="balances")


class User_Transactions(Base):
    def to_dict(self):
        return {
            "transaction_id": self.transaction_id,
            "user_id": self.user_id,
            "date": self.date.isoformat() if self.date else None,
            "amount": self.amount,
            "description": self.description,
            "category_id": self.category_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    __tablename__ = "User_Transactions"

    transaction_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    category_id = Column(Integer, ForeignKey("User_Categories.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_transaction_links = relationship(
        "User_Transaction_Category_Link",
        back_populates="user_transaction",
        cascade="all, delete-orphan"
    )

class User_Transaction_Category_Link(Base):
    __tablename__ = "User_Transaction_Category_Link"

    id = Column(Integer, primary_key=True)
    transaction_id = Column(Integer, ForeignKey("User_Transactions.transaction_id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("User_Categories.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_transaction = relationship("User_Transactions", back_populates="user_transaction_links")
    category = relationship("User_Categories", back_populates="user_transaction_links")
    __table_args__ = (
        UniqueConstraint('transaction_id', name='_user_transaction_id_uc'),
    )

    def to_dict(self):
        return {
            "transaction_id": self.transaction_id,
            "user_id": self.user_id,
            "date": self.date.isoformat(),
            "amount": self.amount,
            "description": self.description,
            "category_id": self.category_id,
            "created_at": self.created_at.isoformat(),
        }

class Stock_Prediction(Base):
    __tablename__ = "Stock_Predictions"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(10), nullable=False, index=True)
    predicted_price = Column(Float, nullable=False)
    confidence_low = Column(Float, nullable=True)
    confidence_high = Column(Float, nullable=True)
    prediction_time = Column(DateTime, default=datetime.utcnow, index=True)
    horizon_minutes = Column(Integer, default=5)
    model_version = Column(String(50), default="ChronosFineTuned")
    created_at = Column(DateTime, default=datetime.utcnow)

