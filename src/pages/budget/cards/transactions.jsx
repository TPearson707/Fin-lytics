import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

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
            } catch (err) {
                if (err.response && err.response.status === 401) {
                    console.error("Unauthorized: Redirecting to login.");
                    alert("Your session has expired. Please log in again.");
                    localStorage.removeItem("token");
                    navigate("/login");
                } else {
                    console.error("Error fetching transactions:", err);
                    setError("No transactions in the past 30 days");
                }
                setLoading(false);
            }
        };

        fetchTransactions();
    }, [navigate]);

    return (
        <Paper elevation={1} sx={{ p: 2 }} className="transaction-card">
            {/* <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">Recent Transactions</Typography>
                <Typography variant="caption" color="text.secondary">Last 30 days</Typography>
            </Box> */}

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && !loading && (
                <Alert severity="info">{error}</Alert>
            )}

            {!loading && !error && (
                <List sx={{ maxHeight: 320, overflow: 'auto' }}>
                    {transactions.length === 0 ? (
                        <ListItem>
                            <ListItemText primary="No transactions in the past 30 days" />
                        </ListItem>
                    ) : (
                        transactions.map((tx) => (
                            <React.Fragment key={tx.transaction_id}>
                                <ListItem alignItems="center">
                                    <ListItemText
                                        primary={tx.merchant_name || tx.category || 'Unknown'}
                                        secondary={new Date(tx.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                                    />
                                    <ListItemSecondaryAction>
                                        <Typography sx={{ color: tx.amount < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                                            ${Math.abs(tx.amount).toFixed(2)}
                                        </Typography>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <Divider component="li" />
                            </React.Fragment>
                        ))
                    )}
                </List>
            )}
        </Paper>
    );
};

export default TransactionCard;