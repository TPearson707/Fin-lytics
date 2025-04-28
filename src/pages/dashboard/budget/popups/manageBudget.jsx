import React, { useState } from "react";
import "../../../../components/popups/modal.scss";
import "./QApopups.scss";

const ManageBudgets = ({ onClose }) => {
    const [annualBudget, setAnnualBudget] = useState({
        name: "Annual Budget",
        amount: 50000,
        current: 45000,
    });

    const [categories, setCategories] = useState([
        { id: 1, name: "Entertainment", current: 4000, actual: 3500 },
        { id: 2, name: "Food", current: 8000, actual: 7500 },
        { id: 3, name: "Utilities", current: 2000, actual: 1800 },
        { id: 4, name: "Transportation", current: 1500, actual: 1400 },
    ]);

    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    x
                </button>
                <h2>Manage Budget Projections</h2>

                <div className="annual-budget">
                    <h3>Set annual budget goals:</h3>
                    <p>Current Goal:</p>
                    <p>{annualBudget.name}</p>
                    <p>${annualBudget.current} / ${annualBudget.amount}</p>
                    <form>
                        <div className="form-group">
                            <label>Budget Name:</label>
                            <input type="text" placeholder="Enter budget name" />
                        </div>
                        <div className="form-group">
                            <label>Amount:</label>
                            <input type="number" placeholder="Enter budget amount" />
                        </div>
                        <button type="submit">Save</button>
                    </form>
                </div>

                <BudgetGoals categories={categories} />
            </div>
        </div>
    );
};

const BudgetGoals = ({ categories }) => {
    return (
        <div className="categorical-budget">
            <h3>Set categorical budget goals:</h3>
            <div className="transaction-list">
                <ul>
                    {categories.map((category) => (
                        <li key={category.id}>
                            <div className="transaction-row">
                                <span className="transaction-name">{category.name}</span>
                                <div className="transaction-amounts">
                                    
                                    <span className="transaction-date">Current: ${category.current}</span>
                                    <span className="transaction-amount"> / ${category.actual}</span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ManageBudgets;