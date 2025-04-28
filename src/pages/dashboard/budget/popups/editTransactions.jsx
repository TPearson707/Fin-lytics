import React, { useState } from "react";
import "./QApopups.scss";

const EditTransactions = ({ onClose }) => {
    const [transactions, setTransactions] = useState([
        { id: 1, name: "Groceries", amount: 50, date: "1/1/2025" },
        { id: 2, name: "Utilities", amount: 100, date: "2/2/2025" },
        { id: 3, name: "Rent", amount: 1200, date: "3/3/2025" },
    ]);

    //placeholder to add functionality to pull transactions from database, from user manual input + plaid transactions
    //placeholder to add functionality to add/remove transactions to database
    //placeholder to edit transactions in database

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
                        {transactions.map((transaction) => (
                            <li key={transaction.id} className="transaction-item">
                            <div className="transaction-row">
                                <span className="transaction-date">{transaction.date}</span>
                                <span className="transaction-name">{transaction.name}</span>
                                <span className="transaction-amount">${transaction.amount.toFixed(2)}</span>
                            </div>
                            </li>
                        ))}
                    </ul>
                    </div>
                    
                </div>
                
                <button type="button" className="add-button">Add Transaction</button>
                {/* <form>
                    <label>
                        Transaction Name:
                        <input type="text" placeholder="Enter transaction name" />
                    </label>
                    <label>
                        Amount:
                        <input type="number" placeholder="Enter amount" />
                    </label>
                    <button type="submit">Save</button>
                </form> */}
            </div>
        </div>
    );
};

export default EditTransactions;

const recentTransactions = () => {
    
};