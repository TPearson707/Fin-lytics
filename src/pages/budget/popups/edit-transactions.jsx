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
} from "@mui/material";
import axios from "axios";
import AddTransactionDialog from "./AddTransactionDialog";

const EditTransactions = ({ onClose }) => {
    const [transactions, setTransactions] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 5;

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

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Edit Transactions</DialogTitle>
            <DialogContent>
                <Typography variant="body1" gutterBottom>
                    Add/Remove/Edit Transactions.
                </Typography>

                <Typography variant="h6">Recent Transactions:</Typography>
                <List>
                    {paginatedTransactions.map((transaction) => (
                        <ListItem key={transaction.transaction_id} divider>
                            <ListItemText
                                primary={transaction.merchant_name || transaction.category}
                                secondary={`Date: ${transaction.date} | Amount: $${transaction.amount.toFixed(2)}`}
                            />
                        </ListItem>
                    ))}
                </List>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                    <Button
                        variant="contained"
                        onClick={handlePrevPage}
                        disabled={currentPage === 0}
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
                    >
                        Next
                    </Button>
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">
                    Close
                </Button>
                <Button variant="contained" color="primary" onClick={() => setIsAddOpen(true)}>
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