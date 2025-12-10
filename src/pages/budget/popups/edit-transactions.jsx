import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CircularProgress from '@mui/material/CircularProgress';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Box,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormControlLabel,
    Checkbox,
    Stack,
    Chip,
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import RecurringChildrenModal from './recurring-info';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import AddTransactionDialog from "./add-transaction";

const EditTransactions = ({ onClose }) => {
    // Category color state and fetch logic (copied from WeeklyOverview.jsx)
    const [categoryColors, setCategoryColors] = useState({});
    const [colorLoading, setColorLoading] = useState(false);

    const fetchCategoryColors = async () => {
        try {
            setColorLoading(true);
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
                if (category.name) {
                    colorMap[category.name.trim().toLowerCase()] = category.color;
                }
            });
            setCategoryColors(colorMap);
        } catch (error) {
            console.error('Error fetching category colors:', error);
        } finally {
            setColorLoading(false);
        }
    };

    const getCategoryColor = (category) => {
        if (!category) return '#9E9E9E';
        const norm = category.trim().toLowerCase();
        let color = categoryColors[norm];
        if (!color) {
            const matchingKey = Object.keys(categoryColors).find(key => key === norm);
            if (matchingKey) color = categoryColors[matchingKey];
        }
        return color || '#9E9E9E';
    };

    useEffect(() => {
        fetchCategoryColors();
    }, []);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 8;
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [editForm, setEditForm] = useState({
        merchant_name: '',
        amount: '',
        category: '',
        date: ''
    });
    const [isIncomeEdit, setIsIncomeEdit] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalParent, setModalParent] = useState(null);
    const [modalChildren, setModalChildren] = useState([]);

    const categories = [
        'food',
        'transportation', 
        'utilities',
        'entertainment',
        'shopping',
        'healthcare',
        'education',
        'travel',
        'recurring/subscription',
        'other'
    ];

    const totalPages = Math.ceil(transactions.length / itemsPerPage);

    const getNumericId = (id) => {
        if (!id && id !== 0) return id;
        if (typeof id === 'number') return id;
        if (typeof id === 'string' && id.startsWith('user-')) {
            const num = parseInt(id.replace('user-', ''));
            return isNaN(num) ? id : num;
        }
        return id;
    };

    const formatDisplayDate = (d) => {
        if (!d) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            const [y, m, day] = d.split('-');
            return new Date(y, parseInt(m,10) - 1, parseInt(day,10)).toLocaleDateString();
        }
        const dt = new Date(d);
        return dt.toLocaleDateString();
    };

    const handleEditOccurrence = async (child, payload) => {
        try {
            const token = localStorage.getItem("token");

            let endpoint;
            let sendPayload;
            if (child.source === 'user') {
                const numericId = child.transaction_id.replace('user-', '');
                endpoint = `http://localhost:8000/user_transactions/${numericId}`;
                sendPayload = {
                    amount: payload.amount,
                    merchant_name: payload.merchant_name,
                    category: payload.category,
                    date: payload.date
                };
            } else if (child.source === 'database') {
                endpoint = `http://localhost:8000/entered_transactions/${child.transaction_id}`;
                sendPayload = {
                    date: payload.date,
                    amount: payload.amount,
                    description: payload.merchant_name,
                    category_id: null
                };
            } else {
                alert('This occurrence cannot be edited');
                return;
            }

            await axios.put(endpoint, sendPayload, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });

            // Update local grouped state: replace child in parent's children array or standalone item
            setTransactions(prev => prev.map(t => {
                if (t.children && t.children.some(c => c.transaction_id === child.transaction_id)) {
                    const newChildren = t.children.map(c => c.transaction_id === child.transaction_id ? { ...c, ...payload } : c);
                    return { ...t, children: newChildren };
                }
                if (t.transaction_id === child.transaction_id) {
                    return { ...t, ...payload };
                }
                return t;
            }));
        } catch (error) {
            console.error('Error editing occurrence:', error);
            alert('Failed to edit occurrence.');
        }
    };

    const groupTransactions = (txs) => {
        const recurringMap = {};
        const originals = {};
        const singles = [];

        txs.forEach(tx => {
            if (tx.is_recurring && tx.parent_transaction_id) {
                const parentId = tx.parent_transaction_id;
                if (!recurringMap[parentId]) recurringMap[parentId] = [];
                recurringMap[parentId].push(tx);
            } else if (tx.is_recurring && !tx.parent_transaction_id) {
                const nid = getNumericId(tx.transaction_id);
                originals[nid] = tx;
            } else {
                singles.push(tx);
            }
        });

        const grouped = [];
        Object.entries(recurringMap).forEach(([parentId, children]) => {
            const pid = parseInt(parentId);
            if (originals[pid]) {
                const sortedChildren = children.sort((a,b) => new Date(b.date) - new Date(a.date));
                grouped.push({ ...originals[pid], isParent: true, children: sortedChildren, _sortDate: sortedChildren[0]?.date || originals[pid].date });
            } else {
                // No parent found; include children as a representative grouped item
                const sortedChildren = children.sort((a,b) => new Date(b.date) - new Date(a.date));
                grouped.push({ ...sortedChildren[0], isParent: false, children: sortedChildren, _sortDate: sortedChildren[0].date });
            }
        });

        singles.forEach(s => grouped.push({ ...s, _sortDate: s.date }));

        return grouped.sort((a,b) => new Date(b._sortDate) - new Date(a._sortDate));
    };

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("token");
                const response = await axios.get("http://localhost:8000/user_transactions/", {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                });

                // Combine all transaction types from the backend response
                const { plaid_transactions = [], db_transactions = [], user_transactions = [] } = response.data;
                
                // Combine and format all transactions with source indicators
                const allTransactions = [
                    ...plaid_transactions.map(t => ({ ...t, source: 'plaid', editable: false })),
                    ...db_transactions.map(t => ({ ...t, source: 'database', editable: true })),
                    ...user_transactions.map(t => ({ ...t, source: 'user', editable: true }))
                ];

                // Sort by date (most recent first) then group recurring parents so modal shows parents only
                allTransactions.sort((a, b) => {
                    const dateA = new Date(a.date || 0);
                    const dateB = new Date(b.date || 0);
                    return dateB - dateA;
                });

                const grouped = groupTransactions(allTransactions);
                setTransactions(grouped);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching transactions:", error.response ? error.response.data : error);
                setLoading(false);
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

        const [isAddOpen, setIsAddOpen] = useState(false);

    const handleEditTransaction = (transaction) => {
        if (!transaction.editable) {
            alert("This transaction cannot be edited as it comes from an external source.");
            return;
        }
        // Open AddTransactionDialog in edit mode
        setEditTarget(transaction);
        setIsAddOpen(true);
    };

    const handleCancelEdit = () => {
        setEditingTransaction(null);
        setEditForm({
            merchant_name: '',
            amount: '',
            category: '',
            date: ''
        });
    };

    const handleSaveEdit = async (transactionId) => {
        try {
            const token = localStorage.getItem("token");
            const transaction = transactions.find(t => t.transaction_id === transactionId);
            
            if (!transaction) {
                alert("Transaction not found");
                return;
            }

            // normalize amount sign according to income toggle
            let amt = parseFloat(editForm.amount);
            if (isNaN(amt)) amt = 0;
            if (!isIncomeEdit && amt > 0) amt = -amt;

            const updatedTransaction = {
                merchant_name: editForm.merchant_name,
                amount: amt,
                category: editForm.category,
                date: editForm.date
            };

            // Determine which endpoint to use based on transaction source
            let endpoint;
            let payload;
            
            if (transaction.source === 'user') {
                // Extract numeric ID from "user-14" format
                const numericId = transactionId.replace('user-', '');
                endpoint = `http://localhost:8000/user_transactions/${numericId}`;
                payload = {
                    amount: updatedTransaction.amount,
                    merchant_name: updatedTransaction.merchant_name,
                    category: updatedTransaction.category,
                    date: updatedTransaction.date
                };
            } else if (transaction.source === 'database') {
                endpoint = `http://localhost:8000/entered_transactions/${transactionId}`;
                payload = {
                    date: updatedTransaction.date,
                    amount: updatedTransaction.amount,
                    description: updatedTransaction.merchant_name,
                    category_id: null // You might want to handle category mapping here
                };
            } else {
                alert("This transaction cannot be edited");
                return;
            }

            await axios.put(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });

            // Update the local state
            setTransactions(prev => prev.map(t => 
                t.transaction_id === transactionId 
                    ? { ...t, ...updatedTransaction }
                    : t
            ));

            setEditingTransaction(null);
            setEditForm({
                merchant_name: '',
                amount: '',
                category: '',
                date: ''
            });
            setIsIncomeEdit(false);
        } catch (error) {
            console.error("Error updating transaction:", error);
            alert("Failed to update transaction. Please try again.");
        }
    };
    const handleDeleteTransaction = async (transactionId, isParent = false) => {
        if (window.confirm(isParent ? "Delete this recurring transaction and all its occurrences?" : "Are you sure you want to delete this transaction?")) {
            try {
                const token = localStorage.getItem("token");
                const transaction = transactions.find(t => t.transaction_id === transactionId);
                
                if (!transaction) {
                    alert("Transaction not found");
                    return;
                }

                // Determine which endpoint to use based on transaction source and whether this is a parent
                let endpoint;
                
                if (isParent) {
                    // parent_transaction_id should be numeric; transaction.transaction_id is like 'user-123'
                    if (transaction.source === 'user') {
                        const numericId = transaction.transaction_id.replace('user-', '');
                        endpoint = `http://localhost:8000/user_transactions/recurring/${numericId}`;
                    } else {
                        alert("Only user-created recurring parents can be deleted in bulk.");
                        return;
                    }
                } else {
                    if (transaction.source === 'user') {
                        // Extract numeric ID from "user-14" format
                        const numericId = transaction.transaction_id.replace('user-', '');
                        endpoint = `http://localhost:8000/user_transactions/${numericId}`;
                    } else if (transaction.source === 'database') {
                        endpoint = `http://localhost:8000/entered_transactions/${transactionId}`;
                    } else {
                        alert("This transaction cannot be deleted");
                        return;
                    }
                }

                await axios.delete(endpoint, {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                });

                // Remove from local state
                if (isParent) {
                    // remove parent (grouped list contains parent items)
                    setTransactions(prev => prev.filter(t => t.transaction_id !== transactionId));
                } else {
                    // child deletion: remove child from any parent's children array; if the child was standalone, remove it
                    setTransactions(prev => prev.map(t => {
                        if (t.children && t.children.length > 0) {
                            const filtered = t.children.filter(c => c.transaction_id !== transactionId);
                            return { ...t, children: filtered };
                        }
                        return t;
                    }));
                }
            } catch (error) {
                console.error("Error deleting transaction:", error);
                alert("Failed to delete transaction. Please try again.");
            }
        }
    };

    const handleUpdateFromDialog = async (payload) => {
        try {
            const token = localStorage.getItem("token");
            const transaction = editTarget;
            if (!transaction) {
                alert("No transaction selected for edit");
                return;
            }

            // Build appropriate payload and endpoint depending on source
            let endpoint;
            let sendPayload;
            if (transaction.source === 'user') {
                const numericId = transaction.transaction_id.replace('user-', '');
                endpoint = `http://localhost:8000/user_transactions/${numericId}`;
                sendPayload = {
                    amount: payload.amount,
                    merchant_name: payload.merchant_name,
                    category: payload.category,
                    date: payload.date
                };
            } else if (transaction.source === 'database') {
                endpoint = `http://localhost:8000/entered_transactions/${transaction.transaction_id}`;
                sendPayload = {
                    date: payload.date,
                    amount: payload.amount,
                    description: payload.merchant_name,
                    category_id: null
                };
            } else {
                alert("This transaction cannot be edited");
                return;
            }

            await axios.put(endpoint, sendPayload, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });

            // Update local state
            setTransactions(prev => prev.map(t => t.transaction_id === transaction.transaction_id ? { ...t, ...{
                merchant_name: payload.merchant_name,
                amount: payload.amount,
                category: payload.category,
                date: payload.date
            } } : t));

            setEditTarget(null);
        } catch (error) {
            console.error('Error updating transaction from dialog:', error);
            alert('Failed to update transaction.');
        }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ position: 'relative' }}>
                Manage Transactions
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body1" gutterBottom>
                    View all your transactions and manage the ones you've added manually. 
                    Transactions from external sources (like Plaid) are read-only.
                </Typography>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Transactions from external sources (like Plaid) are read-only.
                    </Typography>
                </Box>

                <Typography variant="h6">Recent Transactions:</Typography>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : transactions.length === 0 ? (
                    <Box sx={{ 
                        textAlign: 'center', 
                        py: 4,
                        color: '#666',
                        fontStyle: 'italic'
                    }}>
                        <span>No transactions found. Add your first transaction to get started!</span>
                    </Box>
                ) : (
                    <>
                        <List>
                            {paginatedTransactions.map((transaction) => (
                                <ListItem key={transaction.transaction_id} divider sx={{ py: 2 }}>
                                    <>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                            {transaction.merchant_name || 'Unknown Merchant'}
                                                        </Typography>
                                                        {/* Category chip: use color for user transactions, outlined for others */}
                                                        {transaction.source === 'user' ? (
                                                            colorLoading ? (
                                                                <Chip 
                                                                    label={transaction.category || 'other'}
                                                                    size="small"
                                                                    sx={{ fontSize: '0.75rem', backgroundColor: '#eee' }}
                                                                />
                                                            ) : (
                                                                <Chip 
                                                                    label={transaction.category || 'other'}
                                                                    size="small"
                                                                    sx={{ fontSize: '0.75rem', backgroundColor: getCategoryColor(transaction.category), color: '#fff', fontWeight: 600 }}
                                                                />
                                                            )
                                                        ) : (
                                                            <Chip 
                                                                label={transaction.category || 'other'} 
                                                                size="small" 
                                                                variant="outlined"
                                                                sx={{ fontSize: '0.75rem' }}
                                                            />
                                                        )}
                                                        <Chip 
                                                            label={transaction.source || 'unknown'} 
                                                            size="small" 
                                                            color={
                                                                transaction.source === 'plaid' ? 'primary' : 
                                                                transaction.source === 'user' ? 'secondary' : 'default'
                                                            }
                                                            sx={{ fontSize: '0.70rem' }}
                                                        />
                                                        {transaction.is_recurring && (
                                                            <Chip
                                                                label="recurring"
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{fontSize: '0.70rem'}}
                                                                color='secondary'
                                                            />
                                                        )}
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box sx={{ mt: 0.5 }}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Date: {formatDisplayDate(transaction.date) || 'N/A'}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: transaction.amount < 0 ? 'error.main' : 'success.main' }}>
                                                            Amount: ${Math.abs(transaction.amount).toFixed(2) || '0.00'}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                {transaction.editable ? (
                                                    <>
                                                        <IconButton
                                                            onClick={() => handleEditTransaction(transaction)}
                                                            size="small"
                                                            sx={{ color: '#2563eb' }}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        {transaction.is_recurring && (transaction.isParent || !transaction.parent_transaction_id || (transaction.children && transaction.children.length > 0)) && (
                                                            <IconButton
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        const children = transaction.children || [];
                                                                        setModalParent(transaction);
                                                                        setModalChildren(children);
                                                                        setModalOpen(true);
                                                                    } catch (err) {
                                                                        console.error('Error opening occurrences modal:', err);
                                                                    }
                                                                }}
                                                                size="small"
                                                                aria-label="view occurrences"
                                                                color='secondary'
                                                            >
                                                                <HistoryIcon fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                        <IconButton
                                                            onClick={e => { e.stopPropagation(); const isParent = transaction.isParent || (transaction.is_recurring && !transaction.parent_transaction_id); handleDeleteTransaction(transaction.transaction_id, isParent); }}
                                                            size="small"
                                                            sx={{ color: 'error.main' }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </>
                                                ) : (
                                                    <Box sx={{ 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        alignItems: 'center',
                                                        opacity: 0.5,
                                                        gap: 0.5,
                                                        p: 1
                                                    }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            View Only
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </>
                                </ListItem>
                            ))}
                        </List>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                            <Button
                                variant="contained"
                                onClick={handlePrevPage}
                                disabled={currentPage === 0}
                                sx={{
                                    backgroundColor: '#2563eb',
                                    '&:hover': {
                                        backgroundColor: '#1d4ed8'
                                    }
                                }}
                            >
                                Previous
                            </Button>
                            <Typography>
                                Page {currentPage + 1} of {totalPages}
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages - 1}
                                sx={{
                                    backgroundColor: '#2563eb',
                                    '&:hover': {
                                        backgroundColor: '#1d4ed8'
                                    }
                                }}
                            >
                                Next
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={onClose}
                    sx={{ 
                        color: '#666',
                        '&:hover': {
                            backgroundColor: 'rgba(102, 102, 102, 0.1)'
                        }
                    }}
                >
                    Close
                </Button>
                <Button 
                    variant="contained" 
                    onClick={() => setIsAddOpen(true)}
                    sx={{
                        backgroundColor: '#2563eb',
                        color: 'white',
                        '&:hover': {
                            backgroundColor: '#1d4ed8'
                        }
                    }}
                >
                    Add Transaction
                </Button>
            </DialogActions>
            {isAddOpen && (
                <AddTransactionDialog
                    open={isAddOpen}
                    onClose={() => { setIsAddOpen(false); setEditTarget(null); }}
                    {...(editTarget ? {
                        initialData: editTarget,
                        isEdit: true,
                        onSubmit: handleUpdateFromDialog
                    } : {
                        onCreated: async () => {
                            // Refresh all transactions after adding a new one
                            try {
                                const token = localStorage.getItem("token");
                                const response = await axios.get("http://localhost:8000/user_transactions/", {
                                    headers: { Authorization: `Bearer ${token}` },
                                    withCredentials: true,
                                });

                                const { plaid_transactions = [], db_transactions = [], user_transactions = [] } = response.data;
                                
                                const allTransactions = [
                                    ...plaid_transactions.map(t => ({ ...t, source: 'plaid', editable: false })),
                                    ...db_transactions.map(t => ({ ...t, source: 'database', editable: true })),
                                    ...user_transactions.map(t => ({ ...t, source: 'user', editable: true }))
                                ];

                                allTransactions.sort((a, b) => {
                                    const dateA = new Date(a.date || 0);
                                    const dateB = new Date(b.date || 0);
                                    return dateB - dateA;
                                });

                                const groupedRefreshed = groupTransactions(allTransactions);
                                setTransactions(groupedRefreshed);
                            } catch (error) {
                                console.error("Error refreshing transactions:", error);
                            }
                        }
                    })}
                />
            )}
            {modalOpen && (
                <RecurringChildrenModal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    parent={modalParent || {}}
                    childrenList={modalChildren}
                    onDelete={handleDeleteTransaction}
                    onEdit={handleEditOccurrence}
                />
            )}
        </Dialog>
    );
};

export default EditTransactions;

