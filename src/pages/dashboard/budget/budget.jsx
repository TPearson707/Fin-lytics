import React from "react";
import { Box, Grid, Paper, Typography, Button } from "@mui/material";
import "../../../styles/pages/dashboard/budget-page/budget.scss";
import { useEffect, useState } from "react";
import axios from "axios";
// import QuickAccess from "./cards/quickaccess.jsx" removed since logic will probably be simple enough to leave in parent
// import WeeklyOverview from "./cards/weekly/weekly.jsx"
import VisualCard from "./cards/visualdata.jsx"
// import MyAccountsCard from "./cards/myaccounts.jsx"
import ProjectionsCard from "./cards/projections.jsx"
import TransactionCard from "./cards/transactions.jsx"
import EditTransactions from "./popups/editTransactions.jsx";
import ManageBudgets from "./popups/manageBudget.jsx";
import EditAccounts from "./popups/editAccounts.jsx";
import { useNavigate } from "react-router-dom";


const Budget = () => {
    const [isEditTransactionsOpen, setIsEditTransactionsOpen] = useState(false);
    const [isManageBudgetsOpen, setIsManageBudgetsOpen] = useState(false);
    const [isEditAccountsOpen, setIsEditAccountsOpen] = useState(false);

    return (
        <Box className="page-container" sx={{ padding: "20px" }}>
            <Typography variant="h4" gutterBottom>
                Budget Manager
            </Typography>
            <Grid container spacing={3} className="budget-content">
                <Grid className="group3">
                    <Paper elevation={3} className="quick-card">
                        <Typography variant="h6" className="card-title">
                            Quick Access
                        </Typography>
                        <QuickAccess
                            onEditTransactions={() => setIsEditTransactionsOpen(true)}
                            onManageBudgets={() => setIsManageBudgetsOpen(true)}
                            onEditAccounts={() => setIsEditAccountsOpen(true)}
                        />
                    </Paper>
                </Grid>
                <Grid className="group1">
                    <Paper elevation={3} className="week-card">
                        <Typography variant="h6" className="card-title">
                            Weekly Overview
                        </Typography>
                        {/* <WeeklyOverview/> */}
                    </Paper>
                </Grid>
                <Grid className="group3">
                    <Paper elevation={3} className="transactions-card">
                        <Typography variant="h6" className="card-title">
                            Recent Transactions
                        </Typography>
                        <TransactionCard />
                    </Paper>
                </Grid>
                <Grid className="group3">
                    <Paper elevation={3} className="visual-card">
                        <Typography variant="h6" className="card-title">
                            Data Analytics
                        </Typography>
                        <VisualCard />
                    </Paper>
                </Grid>
                <Grid className="group3">
                    <Paper elevation={3} className="projections-card">
                        <Typography variant="h6" className="card-title">
                            Budget Projections
                        </Typography>
                        <ProjectionsCard />
                    </Paper>
                </Grid>
                
            </Grid>

            {isEditTransactionsOpen && (
                <EditTransactions onClose={() => setIsEditTransactionsOpen(false)} />
            )}
            {isManageBudgetsOpen && (
                <ManageBudgets onClose={() => setIsManageBudgetsOpen(false)} />
            )}
            {isEditAccountsOpen && (
                <EditAccounts onClose={() => setIsEditAccountsOpen(false)} />
            )}
        </Box>
    )
}

export default Budget;

const QuickAccess = ({ onEditTransactions, onManageBudgets, onEditAccounts }) => {
    return (
        <div className="card-content">
            <div className="card-body">
                <button onClick={onEditTransactions}>Edit Transactions</button>
                <button onClick={onManageBudgets}>Manage Budget</button>
                <button onClick={onEditAccounts}>Edit Accounts</button>
            </div>
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
    const navigate = useNavigate();

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
                if (error.response && error.response.status === 401) {
                    console.error("Unauthorized: Redirecting to login.");
                    alert("Your session has expired. Please log in again.");
                    localStorage.removeItem("token");
                    navigate("/login");
                } else {
                    console.error("Error fetching balances:", error);
                }
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