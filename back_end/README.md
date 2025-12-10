# Finlytics

An all-in-one personal finance management web application designed to empower users to take control of their financial future. Built with a FastAPI backend and React frontend.

## Features

- **User Authentication**: Secure login system to protect user data
- **Expense Tracking**: Manual entry of expenses with categorization and budget summaries
- **Savings Goals**: Set and monitor savings objectives over specified timeframes
- **Investment Portfolio Management**: Manual asset entry with buy price, quantity, and date to calculate gains/losses
- **Budget Manager**: Quick access toolbar and calendar view for tracking transactions
- **Stock Market Integration**: Real-time stock data via Polygon and Financial Modeling Prep APIs
- **Bank Account Integration**: Plaid API integration for account linking
- **AI-Powered Insights**: Market predictions and financial advice using machine learning models
- **Payment Processing**: Stripe integration for premium features
- **Secure Operations**: Input validation and encrypted data storage

## Prerequisites

**Backend:**
- Python 3.8+
- MySQL database
- Environment variables configuration

**Frontend:**
- Node.js 16+ and npm
- Modern web browser

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TPearson707/Fin-lytics.git
   cd Fin-lytics/back_end
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Download and setup AI model:**
   - Download the AI model from: https://drive.google.com/file/d/1uHip-jQ2rocFI-EDRnb5s5L4bq8KYDJI/view?usp=sharing
   - Unzip the downloaded file
   - Place the unzipped contents in the root folder of the project

## Frontend Installation

1. **Navigate to the root directory:**
   ```bash
   cd ..  # From back_end directory, go back to root
   # Or from anywhere: cd Fin-lytics
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

## Configuration

### Environment Variables

Create a `.env` file in the `back_end` directory with the following variables:

```env
# Database Configuration
DATABASE_URL=mysql+pymysql://username:password@host:port/database_name

# Plaid API Configuration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENVIRONMENT=sandbox

# Email Service Configuration (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_SENDER_EMAIL=noreply@yourdomain.com  # Must be from verified domain

# Stock Market Data APIs
POLYGON_API_KEY=your_polygon_api_key
FMP_API_KEY=your_fmp_api_key

# Payment Processing (Stripe)
STRIPE_KEY=your_stripe_secret_key
STRIPE_PRICE_ID=your_stripe_price_id

# Security & Encryption
JWT_SECRET_KEY=your_secure_jwt_secret_key
JWT_ALGORITHM=HS256
ENCRYPTION_KEY=your_encryption_key
```

### API Setup Notes

- **Database**: Create a MySQL database and update DATABASE_URL in `.env`
- **Plaid**: Get API keys from [Plaid Dashboard](https://dashboard.plaid.com/) for bank account integration
- **Resend**: Get API key from [Resend Dashboard](https://resend.com/) - sender email must be from a verified domain
- **Polygon**: Get API key from [Polygon.io](https://polygon.io/) for stock market data
- **FMP**: Get API key from [Financial Modeling Prep](https://financialmodelingprep.com/) for financial data
- **Stripe**: Get keys from [Stripe Dashboard](https://dashboard.stripe.com/) for payment processing
- **Encryption Key**: Generate a secure key for data encryption (base64 encoded)
- **Tables**: Database tables are created automatically on first run

## Running the Application

### Development

**Backend (Terminal 1):**
1. **Navigate to backend directory and start the FastAPI server:**
   ```bash
   cd back_end
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Access the API documentation:**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

**Frontend (Terminal 2):**
1. **Navigate to root directory and start the React development server:**
   ```bash
   cd ..  # From back_end, go to root
   npm run dev
   ```

2. **Access the application:**
   - Frontend: http://localhost:5173
   - The frontend will automatically connect to the backend on port 8000

### Production

**Backend:**
1. **Use a production ASGI server like Gunicorn:**
   ```bash
   cd back_end
   pip install gunicorn
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

**Frontend:**
1. **Build the React application:**
   ```bash
   npm run build
   ```

2. **Serve the built files using a web server**

## Troubleshooting

### Common Issues

**Backend Issues:**
1. **Database Connection Error:**
   - Check your DATABASE_URL in `.env`
   - Ensure database server is running
   - Verify network connectivity

2. **Import Errors:**
   - Check all dependencies are installed: `pip install -r requirements.txt`
   - Ensure you're in the correct virtual environment

**Frontend Issues:**
3. **Frontend won't start:**
   - Check that Node.js 16+ is installed: `node --version`
   - Try deleting `node_modules` and running `npm install` again
   - Ensure you're in the root directory (not back_end)

4. **API Connection Errors:**
   - Verify the backend is running on port 8000
   - Check browser console for CORS or network errors
   - Ensure both frontend and backend are running simultaneously

### Logs

Check application logs for detailed error information:
```bash
# Run with verbose logging
uvicorn main:app --reload --log-level debug
```

## Technologies Used

**Frontend:**
- React.js with modern hooks and components
- SCSS for styling
- React Router for navigation
- Vite for build tooling

**Backend:**
- FastAPI (Python web framework)
- SQLAlchemy ORM with MySQL database
- JWT authentication
- Pydantic for data validation

**APIs & Services:**
- Plaid API for bank integration
- Polygon.io for stock market data
- Financial Modeling Prep for financial data
- Stripe for payment processing
- Resend for email services

**AI/ML:**
- AutoGluon for time series predictions
- Custom trained models for financial forecasting

**Development:**
- Git/GitHub for version control
- Python virtual environments
- npm for package management

## Contributors

- **Lilly Ngo** (_ngosterly_) – Frontend Development, UI/UX Design, Project Conceptualization
- **Thomas Pearson** (_TPearson707_) – Full-Stack Development, Front/Backend Integration  
- **Hayden Komasz** (_HaydenK19_) - Database Development, Front/Backend Integration
- **Adam Plankey** (_adamplankey_) - Backend Development, API Integration, Backend Integration