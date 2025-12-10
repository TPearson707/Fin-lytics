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
import HistoryIcon from '@mui/icons-material/History';

const TransactionCard = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [categoryColors, setCategoryColors] = useState({});
    const navigate = useNavigate();
    // no inline modal in the card; show simple Recurring tag only

    const fetchCategoryColors = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.id;
            
            const response = await axios.get(`http://localhost:8000/user_categories/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });
            
            const colorMap = {};
            response.data.forEach(category => {
                colorMap[category.name] = category.color;
            });
            console.log('Transaction Card: Fetched category colors:', colorMap);
            setCategoryColors(colorMap);
        } catch (error) {
            console.error('Error fetching category colors:', error);
        }
    };

    // helper function to get category color
    const getCategoryColor = (category) => {
        if (!category) return '#9E9E9E';
        
        // try direct lookup
        let color = categoryColors[category];
        
        //try case-insensitive lookup to match plaid and our dbs
        if (!color) {
            const matchingKey = Object.keys(categoryColors).find(
                key => key.toLowerCase() === category.toLowerCase()
            );
            if (matchingKey) {
                color = categoryColors[matchingKey];
            }
        }
        
        //  grey if still no color found
        color = color || '#9E9E9E';
        console.log('Transaction Card: Getting color for category:', category, '=> color:', color);
        return color;
    };

    useEffect(() => {
        fetchCategoryColors();
    }, []);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get("http://localhost:8000/user_transactions/", {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                });

                // Combine all transaction sources
                const allTransactions = [
                    ...(response.data.db_transactions || []),
                    ...(response.data.plaid_transactions || []),
                    ...(response.data.user_transactions || []),
                    ...(response.data.recurring_transactions || [])
                ];

                // keep full fetched list if needed by other components

                // Show recent transactions (last 30 days) but only one instance per recurring series
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const seenParents = new Set();
                const recentTransactions = [];

                // sort descending first
                const sorted = allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

                for (const tx of sorted) {
                    // skip transactions outside 30-day window
                    if (!tx.date || new Date(tx.date) < thirtyDaysAgo) continue;

                    // If this is a child occurrence of a recurring series, skip it (we'll show the parent only)
                    if (tx.is_recurring && tx.parent_transaction_id) {
                        // mark parent seen so we don't add another parent later
                        seenParents.add(tx.parent_transaction_id);
                        continue;
                    }

                    // If this is a recurring parent, ensure we only add it once
                    if (tx.is_recurring && !tx.parent_transaction_id) {
                        const numericId = tx.transaction_id && tx.transaction_id.toString().startsWith('user-') ? parseInt(tx.transaction_id.replace('user-', '')) : tx.transaction_id;
                        if (seenParents.has(numericId)) {
                            // parent already implied by child, still include parent once
                            // but avoid duplicates
                            if (recentTransactions.some(r => r.transaction_id === tx.transaction_id)) continue;
                        }
                        recentTransactions.push({ ...tx, isParent: true });
                        seenParents.add(numericId);
                        continue;
                    }

                    // Normal non-recurring transaction
                    recentTransactions.push(tx);
                }

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

        // fetchTransactions end
        fetchTransactions();
    }, [navigate]);

        // fetchTransactions end
    

    return (
        <Box sx={{ p: 2 }} className="transaction-card">
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
                <Box sx={{ 
                    maxHeight: '300px', // Reduced from 400px to 300px
                    overflowY: 'auto',  // Add scroll bar when content exceeds max height
                    border: '1px solid rgba(0, 0, 0, 0.12)', // Optional: add subtle border
                    borderRadius: 1,
                    '&::-webkit-scrollbar': {
                        width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '4px',
                        '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        },
                    },
                }}>
                    <List sx={{ p: 0 }}>
                        {transactions.length === 0 ? (
                            <ListItem>
                                <ListItemText primary="No transactions in the past 30 days" />
                            </ListItem>
                        ) : (
                            transactions.map((tx) => (
                                <React.Fragment key={tx.transaction_id}>
                                    <ListItem 
                                        alignItems="center"
                                        sx={{
                                            backgroundColor: getCategoryColor(tx.category) + '10',
                                            border: `1px solid ${getCategoryColor(tx.category)}30`,
                                            borderRadius: 1,
                                            mb: 0.5,
                                            py: 0.5, // Reduced padding from default (usually 1)
                                            px: 1, // Reduced horizontal padding
                                            minHeight: '48px', // Set minimum height for consistency
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                                            <Box 
                                                sx={{ 
                                                    width: 8, 
                                                    height: 8, 
                                                    borderRadius: '50%', 
                                                    backgroundColor: getCategoryColor(tx.category),
                                                    flexShrink: 0
                                                }} 
                                            />
                                        </Box>
                                        <ListItemText
                                            primary={
                                                <Typography noWrap sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {tx.merchant_name || tx.category || 'Unknown'}
                                                </Typography>
                                            }
                                            secondary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {new Date(tx.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                                                    </Typography>
                                                    {tx.isParent && (
                                                        <HistoryIcon sx={{ color: 'action.active', ml: 0.5 }} fontSize="small" />
                                                    )}
                                                </Box>
                                            }
                                        />
                                        <ListItemSecondaryAction>
                                            <Typography sx={{ color: tx.amount < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                                                ${Math.abs(tx.amount).toFixed(2)}
                                            </Typography>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                </React.Fragment>
                            ))
                        )}
                    </List>
                </Box>
            )}
            {/* No inline occurrences modal in the card */}
        </Box>
    );
};

export default TransactionCard;