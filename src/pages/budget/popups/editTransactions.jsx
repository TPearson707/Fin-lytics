import React, { useState, useEffect } from "react";
import axios from "axios";
import "./editTran.scss";

const EditTransactions = ({ onClose }) => {
    const [transactions, setTransactions] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 5;

    const totalPages = Math.ceil(transactions.length / itemsPerPage);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get("http://localhost:8000/user_transactions/", {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                });

                const { db_transactions } = response.data;
                setTransactions(db_transactions);
            } catch (error) {
                console.error("Error fetching transactions:", error.response ? error.response.data : error);
            }
        };

        fetchTransactions();
    }, []);

    const handleNextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage((prev) => prev - 1);
        }
    };

    const paginatedTransactions = transactions.slice(
        currentPage * itemsPerPage,
        currentPage * itemsPerPage + itemsPerPage
    );

    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    x
                </button>
                <h2>Edit Transactions</h2>
                <p>Add/Remove/Edit Transactions.</p>

                <div className="recent-transactions">
                    <p>Recent Transactions:</p>
                    <div className="transaction-list">
                        <ul>
                            {paginatedTransactions.map((transaction) => (
                                <li key={transaction.transaction_id} className="transaction-item">
                                    <div className="transaction-row">
                                        <span className="transaction-date">{transaction.date}</span>
                                        <span className="transaction-name">{transaction.merchant_name || transaction.category}</span>
                                        <span className="transaction-amount">
                                            ${transaction.amount.toFixed(2)}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="carousel-controls">
                    <button
                        type="button"
                        className="prev-button"
                        onClick={handlePrevPage}
                        disabled={currentPage === 0}
                    >
                        ←
                    </button>
                    <span>
                        Page {currentPage + 1} of {totalPages}
                    </span>
                    <button
                        type="button"
                        className="next-button"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages - 1}
                    >
                        →
                    </button>
                </div>

                <button type="button" className="add-button">
                    Add Transaction
                </button>
            </div>
        </div>
    );
};

export default EditTransactions;