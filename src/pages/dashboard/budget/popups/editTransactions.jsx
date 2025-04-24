import React, { useState } from "react";
import "../../../../components/popups/modal.scss";

const EditTransactions = ({ onClose }) => {
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
                </div>
                
                <button>Add Transaction</button>
                <button></button>
                <form>
                    <label>
                        Transaction Name:
                        <input type="text" placeholder="Enter transaction name" />
                    </label>
                    <label>
                        Amount:
                        <input type="number" placeholder="Enter amount" />
                    </label>
                    <button type="submit">Save</button>
                </form>
            </div>
        </div>
    );
};

export default EditTransactions;

const recentTransactions = () => {
    
};