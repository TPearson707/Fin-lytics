import "../../../../styles/pages/dashboard/budget-page/card.scss";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const TransactionCard = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get("http://localhost:8000/user_transactions/", {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                });

                // Get transactions from the last 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const recentTransactions = response.data.db_transactions
                    .filter(tx => new Date(tx.date) >= thirtyDaysAgo)
                    .sort((a, b) => new Date(b.date) - new Date(a.date));

                setTransactions(recentTransactions);
                setLoading(false);
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    console.error("Unauthorized: Redirecting to login.");
                    alert("Your session has expired. Please log in again.");
                    localStorage.removeItem("token");
                    navigate("/login");
                } else {
                    console.error("Error fetching transactions:", error);
                    setError("No transactions in the past 30 days");
                }
                setLoading(false);
            }
        };

        fetchTransactions();
    }, [navigate]);

    if (loading) return <div className="transaction-card">Loading transactions...</div>;
    if (error) return <div className="transaction-card error">{error}</div>;

    return (
        <div className="transaction-card">
            <div className="transactions-list">
                {transactions.length === 0 ? (
                    <p>No transactions in the past 30 days</p>
                ) : (
                    transactions.map((tx) => (
                        <div key={tx.transaction_id} className="transaction-item">
                            <div className="transaction-info">
                                <span className="merchant">
                                    {tx.merchant_name || tx.category || 'Unknown'}
                                </span>
                                <span className="date">
                                    {new Date(tx.date).toLocaleDateString('en-US', {
                                        month: 'numeric',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                            <span className={`amount ${tx.amount < 0 ? 'negative' : 'positive'}`}>
                                ${Math.abs(tx.amount).toFixed(2)}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default TransactionCard;