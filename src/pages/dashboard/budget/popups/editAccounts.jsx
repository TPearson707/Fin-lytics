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
    TextField,
    IconButton,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil, faCheck } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";

const EditAccounts = ({ onClose }) => {
    const [balances, setBalances] = useState({
        checking: 0,
        savings: 0,
        debit: 0,
        credit: 0,
        cash: 0,
    });
    const [cashInput, setCashInput] = useState(0);
    const [isEditingCash, setIsEditingCash] = useState(false);

    const fetchBalances = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://localhost:8000/user_balances/", {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });

            const { plaid_balances, cash_balance } = response.data;

            const debit = plaid_balances
                .filter(account => account.type === "depository")
                .reduce((sum, account) => sum + (account.balance || 0), 0);

            const savings = plaid_balances
                .filter(account => account.subtype === "savings")
                .reduce((sum, account) => sum + (account.balance || 0), 0);

            const checking = plaid_balances
                .filter(account => account.subtype === "checking")
                .reduce((sum, account) => sum + (account.balance || 0), 0);

            const credit = plaid_balances
                .filter(account => account.type === "credit")
                .reduce((sum, account) => sum + (account.balance || 0), 0);

            setBalances({ debit, credit, cash: cash_balance, savings, checking });
            setCashInput(cash_balance);
        } catch (error) {
            console.error("Error fetching user balances:", error.response ? error.response.data : error);
        }
    };

    useEffect(() => {
        fetchBalances();
    }, []);

    const handleCashUpdate = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                "http://localhost:8000/user_balances/update_cash_balance/",
                { cash_balance: cashInput },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                }
            );

            await fetchBalances();
            setIsEditingCash(false);
        } catch (error) {
            console.error("Error updating cash balance:", error.response ? error.response.data : error);
        }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Edit Accounts</DialogTitle>
            <DialogContent>
                <Typography variant="body1" gutterBottom>
                    View and manage your account balances.
                </Typography>
                <List>
                    <ListItem>
                        <ListItemText
                            primary="Checking"
                            secondary={`$${balances.checking?.toFixed(2) || "0.00"}`}
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText
                            primary="Savings"
                            secondary={`$${balances.savings?.toFixed(2) || "0.00"}`}
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText
                            primary="Debit Total"
                            secondary={`$${balances.debit?.toFixed(2) || "0.00"}`}
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText
                            primary="Credit"
                            secondary={`$${balances.credit?.toFixed(2) || "0.00"}`}
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText
                            primary="Cash"
                            secondary={
                                isEditingCash ? (
                                    <TextField
                                        type="number"
                                        value={cashInput}
                                        onChange={(e) => setCashInput(parseFloat(e.target.value) || 0)}
                                        size="small"
                                    />
                                ) : (
                                    `$${balances.cash?.toFixed(2) || "0.00"}`
                                )
                            }
                        />
                        <IconButton
                            onClick={() => {
                                if (isEditingCash) {
                                    handleCashUpdate();
                                } else {
                                    setIsEditingCash(true);
                                }
                            }}
                        >
                            <FontAwesomeIcon icon={isEditingCash ? faCheck : faPencil} />
                        </IconButton>
                    </ListItem>
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditAccounts;