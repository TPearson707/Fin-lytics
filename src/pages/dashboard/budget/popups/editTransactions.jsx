import React, { useState } from "react";
import "./editTran.scss";

const EditTransactions = ({ onClose }) => {
    const [transactions] = useState([
        { id: 1, name: "Groceries", amount: 50, date: "1/1/2025" },
        { id: 2, name: "Utilities", amount: 100, date: "2/2/2025" },
        { id: 3, name: "Rent", amount: 1200, date: "3/3/2025" },
        { id: 4, name: "Entertainment", amount: 150, date: "4/4/2025" },
        { id: 5, name: "Rent", amount: 1200, date: "6/6/2025" },
        { id: 6, name: "Dining", amount: 75, date: "7/7/2025" },
        { id: 7, name: "Shopping", amount: 200, date: "8/8/2025" },
        { id: 8, name: "Fuel", amount: 60, date: "9/9/2025" },
    ]);

    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 5;

    const totalPages = Math.ceil(transactions.length / itemsPerPage);

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
                                <li key={transaction.id} className="transaction-item">
                                    <div className="transaction-row">
                                        <span className="transaction-date">{transaction.date}</span>
                                        <span className="transaction-name">{transaction.name}</span>
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