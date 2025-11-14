import React, { useState, useEffect } from "react";
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
    Stack,
    Chip,
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from "axios";
import AddTransactionDialog from "./add-transaction";

const EditTransactions = ({ onClose }) => {
    const [transactions, setTransactions] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 5;
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [editForm, setEditForm] = useState({
        merchant_name: '',
        amount: '',
        category: '',
        date: ''
    });

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

        const [isAddOpen, setIsAddOpen] = useState(false);

    const handleEditTransaction = (transaction) => {
        setEditingTransaction(transaction.transaction_id);
        setEditForm({
            merchant_name: transaction.merchant_name || '',
            amount: transaction.amount.toString(),
            category: transaction.category || '',
            date: transaction.date || ''
        });
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
            const updatedTransaction = {
                merchant_name: editForm.merchant_name,
                amount: parseFloat(editForm.amount),
                category: editForm.category,
                date: editForm.date
            };

            await axios.put(`http://localhost:8000/user_transactions/${transactionId}`, updatedTransaction, {
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
        } catch (error) {
            console.error("Error updating transaction:", error);
            alert("Failed to update transaction. Please try again.");
        }
    };

    const handleDeleteTransaction = async (transactionId) => {
        if (window.confirm("Are you sure you want to delete this transaction?")) {
            try {
                const token = localStorage.getItem("token");
                await axios.delete(`http://localhost:8000/user_transactions/${transactionId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                });

                // Remove from local state
                setTransactions(prev => prev.filter(t => t.transaction_id !== transactionId));
            } catch (error) {
                console.error("Error deleting transaction:", error);
                alert("Failed to delete transaction. Please try again.");
            }
        }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ position: 'relative' }}>
                Edit Transactions
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
                    Add/Remove/Edit Transactions.
                </Typography>

                <Typography variant="h6">Recent Transactions:</Typography>
                {transactions.length === 0 ? (
                    <Box sx={{ 
                        textAlign: 'center', 
                        py: 4,
                        color: '#666',
                        fontStyle: 'italic'
                    }}>
                        <Typography variant="body2">
                            No transactions found. Add your first transaction to get started!
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <List>
                            {paginatedTransactions.map((transaction) => (
                                <ListItem key={transaction.transaction_id} divider sx={{ py: 2 }}>
                                    {editingTransaction === transaction.transaction_id ? (
                                        // Editing mode
                                        <Box sx={{ width: '100%' }}>
                                            <Stack spacing={2}>
                                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                                    <TextField
                                                        label="Merchant/Description"
                                                        value={editForm.merchant_name}
                                                        onChange={(e) => setEditForm(prev => ({ 
                                                            ...prev, 
                                                            merchant_name: e.target.value 
                                                        }))}
                                                        size="small"
                                                        sx={{ flex: 1 }}
                                                    />
                                                    <TextField
                                                        label="Amount"
                                                        type="number"
                                                        value={editForm.amount}
                                                        onChange={(e) => setEditForm(prev => ({ 
                                                            ...prev, 
                                                            amount: e.target.value 
                                                        }))}
                                                        size="small"
                                                        sx={{ width: 120 }}
                                                        inputProps={{ step: '0.01' }}
                                                    />
                                                </Stack>
                                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                                    <FormControl size="small" sx={{ minWidth: 150 }}>
                                                        <InputLabel>Category</InputLabel>
                                                        <Select
                                                            value={editForm.category}
                                                            label="Category"
                                                            onChange={(e) => setEditForm(prev => ({ 
                                                                ...prev, 
                                                                category: e.target.value 
                                                            }))}
                                                        >
                                                            {categories.map((cat) => (
                                                                <MenuItem key={cat} value={cat}>
                                                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                    <TextField
                                                        label="Date"
                                                        type="date"
                                                        value={editForm.date}
                                                        onChange={(e) => setEditForm(prev => ({ 
                                                            ...prev, 
                                                            date: e.target.value 
                                                        }))}
                                                        size="small"
                                                        InputLabelProps={{ shrink: true }}
                                                        sx={{ width: 160 }}
                                                    />
                                                </Stack>
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <IconButton
                                                        onClick={() => handleSaveEdit(transaction.transaction_id)}
                                                        size="small"
                                                        sx={{ color: 'success.main' }}
                                                    >
                                                        <SaveIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        onClick={handleCancelEdit}
                                                        size="small"
                                                        sx={{ color: 'error.main' }}
                                                    >
                                                        <CancelIcon />
                                                    </IconButton>
                                                </Stack>
                                            </Stack>
                                        </Box>
                                    ) : (
                                        // read-only mode
                                        <>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                            {transaction.merchant_name || 'Unknown Merchant'}
                                                        </Typography>
                                                        <Chip 
                                                            label={transaction.category || 'other'} 
                                                            size="small" 
                                                            variant="outlined"
                                                            sx={{ fontSize: '0.75rem' }}
                                                        />
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box sx={{ mt: 0.5 }}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Date: {transaction.date || 'N/A'}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                                            Amount: ${transaction.amount?.toFixed(2) || '0.00'}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                <IconButton
                                                    onClick={() => handleEditTransaction(transaction)}
                                                    size="small"
                                                    sx={{ color: '#2563eb' }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() => handleDeleteTransaction(transaction.transaction_id)}
                                                    size="small"
                                                    sx={{ color: 'error.main' }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </>
                                    )}
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
                    onClose={() => setIsAddOpen(false)}
                    onCreated={(tx) => {
                        // prepend to transactions for immediate feedback
                        setTransactions(prev => [tx, ...prev]);
                    }}
                />
            )}
        </Dialog>
    );
};

export default EditTransactions;