import "./budget.scss"
import React from "react";
import { useEffect, useState } from "react";
import axios from "axios";
// import QuickAccess from "./cards/quickaccess.jsx" removed since logic will probably be simple enough to leave in parent
import WeeklyOverview from "./cards/weekly/weekly.jsx"
import VisualCard from "./cards/visualdata.jsx"
// import MyAccountsCard from "./cards/myaccounts.jsx"
import ProjectionsCard from "./cards/projections.jsx"
import TransactionCard from "./cards/transactions.jsx"
import EditTransactions from "./popups/editTransactions.jsx";
import ManageBudgets from "./popups/manageBudget.jsx";
import EditAccounts from "./popups/editAccounts.jsx";


const Budget = () => {
    return (
        <div className="page-container">
                <h2>Budget Manager</h2>
            <div className="budget-content">
                <div className="group1">
                    <div className="quick-card">
                        <div className="card-title">Quick Access</div>
                        <QuickAccess/>
                    </div>
                    <div className="myaccounts-card">
                        <div className="card-title">My Accounts</div>
                        <MyAccounts/>
                    </div>
                    <div className="transactions-card">
                        <div className="card-title">Recent Transactions</div>
                        <TransactionCard/>
                    </div>
                </div>
                <div className="group2">
                    <div className="week-card">
                        <div className="card-title">Weekly Overview</div>
                        <WeeklyOverview/>
                    </div>
                </div>
                <div className="group3">
                    <div className="visual-card">
                        <div className="card-title">Data Analytics</div>
                        <VisualCard/>
                    </div>
                    <div className="projections-card">
                        <div className="card-title">Budget Projections</div>
                        <ProjectionsCard/>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Budget;

const QuickAccess = () => { //need to open modal for each button
    const [isEditTransactionsOpen, setIsEditTransactionsOpen] = useState(false);
    const [isManageBudgetsOpen, setIsManageBudgetsOpen] = useState(false);
    const [isEditAccountsOpen, setIsEditAccountsOpen] = useState(false);

    return (
        <div className="card-content">
            <div className="card-body">
                <button onClick={() => setIsEditTransactionsOpen(true)}>Edit Transactions</button>
                <button onClick={() => setIsManageBudgetsOpen(true)}>Manage Budget</button>
                <button onClick={() => setIsEditAccountsOpen(true)}>Edit Accounts</button>
            </div>

            {isEditTransactionsOpen && (
                <EditTransactions onClose={() => setIsEditTransactionsOpen(false)} />
            )}
            {isManageBudgetsOpen && (
                <ManageBudgets onClose={() => setIsManageBudgetsOpen(false)} />
            )}
            {isEditAccountsOpen && (
                <EditAccounts onClose={() => setIsEditAccountsOpen(false)} />
            )}
        </div>
    );
}

const MyAccounts = () => {
    const [balances, setBalances] = useState({
        checking: { balance_amount: 0, previous_balance: 0 },
        savings: { balance_amount: 0, previous_balance: 0 },
        cash: { balance_amount: 0, previous_balance: 0 }
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editedBalances, setEditedBalances] = useState({
        checking: '',
        savings: '',
        cash: ''
    });

    useEffect(() => {
        const fetchBalances = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get("http://localhost:8000/balances/", {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                });

                const balancesObj = response.data.reduce((acc, balance) => {
                    acc[balance.balance_name] = {
                        balance_amount: balance.balance_amount,
                        previous_balance: balance.previous_balance
                    };
                    return acc;
                }, {});

                setBalances(balancesObj);
                setEditedBalances({
                    checking: balancesObj.checking?.balance_amount.toString() || '0',
                    savings: balancesObj.savings?.balance_amount.toString() || '0',
                    cash: balancesObj.cash?.balance_amount.toString() || '0'
                });
            } catch (error) {
                console.error("Error fetching balances:", error);
            }
        };

        fetchBalances();
    }, []);

    const handleEditClick = () => {
        setIsEditing(true);
        setEditedBalances({
            checking: balances.checking?.balance_amount.toString() || '0',
            savings: balances.savings?.balance_amount.toString() || '0',
            cash: balances.cash?.balance_amount.toString() || '0'
        });
    };

    const handleSaveBalances = async () => {
        try {
            const token = localStorage.getItem("token");
            const updates = Object.entries(editedBalances).map(([accountType, amount]) => ({
                balance_name: accountType,
                new_amount: parseFloat(amount)
            }));

            for (const update of updates) {
                await axios.put(
                    "http://localhost:8000/balances/update",
                    update,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        withCredentials: true,
                    }
                );
            }

            const newBalances = { ...balances };
            for (const update of updates) {
                if (newBalances[update.balance_name]) {
                    newBalances[update.balance_name].balance_amount = update.new_amount;
                }
            }
            setBalances(newBalances);
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating balances:", error);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    return (
        <div className="card-content">
            <div className="card-body">
                {Object.entries(balances).map(([accountType, data]) => (
                    <li key={accountType}>
                        {accountType.charAt(0).toUpperCase() + accountType.slice(1)}: 
                        {isEditing ? (
                            <div className="balance-edit">
                                <input
                                    type="number"
                                    value={editedBalances[accountType]}
                                    onChange={(e) => setEditedBalances(prev => ({
                                        ...prev,
                                        [accountType]: e.target.value
                                    }))}
                                    step="0.01"
                                />
                            </div>
                        ) : (
                            <>${data.balance_amount.toFixed(2)}</>
                        )}
                    </li>
                ))}
                <div className="balance-actions">
                    {isEditing ? (
                        <>
                            <button onClick={handleSaveBalances}>Save All</button>
                            <button onClick={handleCancelEdit}>Cancel</button>
                        </>
                    ) : (
                        <button onClick={handleEditClick}>Edit Balances</button>
                    )}
                </div>
            </div>
        </div>
    );
};