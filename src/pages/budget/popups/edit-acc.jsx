import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Button,
    Alert,
    Typography,
    Stack,
    Card,
    CardContent,
    TextField,
    Box,
    Chip,
} from '@mui/material';
import {
    Close as CloseIcon,
    Edit as EditIcon,
    Check as CheckIcon,
    AccountBalance as AccountBalanceIcon,
    Savings as SavingsIcon,
    AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';

const EditAccounts = ({ open, onClose, onBalanceUpdate }) => {
    const [balances, setBalances] = useState({
        checking: 0,
        savings: 0,
        cash: 0,
    });

    const [userPlaidStatus, setUserPlaidStatus] = useState({
        hasPlaid: false,
        balancesEditable: true
    });

    // Individual input states for each account type
    const [checkingInput, setCheckingInput] = useState(0);
    const [savingsInput, setSavingsInput] = useState(0);
    const [cashInput, setCashInput] = useState(0);

    // Individual editing states
    const [isEditingChecking, setIsEditingChecking] = useState(false);
    const [isEditingSavings, setIsEditingSavings] = useState(false);
    const [isEditingCash, setIsEditingCash] = useState(false);

    // Fetch initial balance data
    const fetchBalances = async () => {
        try {
            const response = await fetch('http://localhost:8000/user_balances/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Fetched balance data:', data);
                
                // Set balances from unified endpoint
                setBalances({
                    checking: data.manual_balances?.checking || 0,
                    savings: data.manual_balances?.savings || 0,
                    cash: data.cash_balance || 0,  // Cash comes from separate field
                });
                console.log('Updated UI balances:', {
                    checking: data.manual_balances?.checking || 0,
                    savings: data.manual_balances?.savings || 0,
                    cash: data.cash_balance || 0,
                });

                // Set Plaid status from unified endpoint
                setUserPlaidStatus({
                    hasPlaid: data.has_plaid || false,
                    balancesEditable: data.balances_editable || false
                });
            } else if (response.status === 401) {
                console.error('Authentication failed - user not logged in');
                // You might want to redirect to login or show an auth error
            } else {
                console.error('Failed to fetch balances - status:', response.status);
            }
        } catch (error) {
            console.error('Error fetching balances:', error);
        }
    };

    useEffect(() => {
        if (open) {
            fetchBalances();
        }
    }, [open]);

    // Handle updating checking account
    const handleCheckingUpdate = async () => {
        try {
            const response = await fetch('http://localhost:8000/user_balances/manual_balance_update/', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    balance_name: 'checking',
                    new_amount: checkingInput
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Checking balance update result:', result);
                setBalances(prev => ({ ...prev, checking: checkingInput }));
                setIsEditingChecking(false);
                console.log('Checking balance updated successfully');
                // Refresh balance data from backend to ensure consistency
                await fetchBalances();
                // Notify parent component to refresh
                if (onBalanceUpdate) onBalanceUpdate();
            } else {
                console.error('Failed to update checking balance - status:', response.status);
                const errorData = await response.text();
                console.error('Error details:', errorData);
            }
        } catch (error) {
            console.error('Error updating checking balance:', error);
        }
    };

    // Handle updating savings account
    const handleSavingsUpdate = async () => {
        try {
            const response = await fetch('http://localhost:8000/user_balances/manual_balance_update/', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    balance_name: 'savings',
                    new_amount: savingsInput
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Savings balance update result:', result);
                setBalances(prev => ({ ...prev, savings: savingsInput }));
                setIsEditingSavings(false);
                console.log('Savings balance updated successfully');
                // Refresh balance data from backend to ensure consistency
                await fetchBalances();
                // Notify parent component to refresh
                if (onBalanceUpdate) onBalanceUpdate();
            } else {
                console.error('Failed to update savings balance - status:', response.status);
                const errorData = await response.text();
                console.error('Error details:', errorData);
            }
        } catch (error) {
            console.error('Error updating savings balance:', error);
        }
    };

    // Handle updating cash
    const handleCashUpdate = async () => {
        try {
            const response = await fetch('http://localhost:8000/user_balances/manual_balance_update/', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    balance_name: 'cash',
                    new_amount: cashInput
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Cash balance update result:', result);
                setBalances(prev => ({ ...prev, cash: cashInput }));
                setIsEditingCash(false);
                console.log('Cash balance updated successfully');
                // Refresh balance data from backend to ensure consistency
                await fetchBalances();
                // Notify parent component to refresh
                if (onBalanceUpdate) onBalanceUpdate();
            } else {
                console.error('Failed to update cash balance - status:', response.status);
                const errorData = await response.text();
                console.error('Error details:', errorData);
            }
        } catch (error) {
            console.error('Error updating cash balance:', error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ position: 'relative', pb: 1 }}>
                Account Balances
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: 'grey.500',
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {userPlaidStatus.hasPlaid && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Your bank account balances are automatically synced through Plaid. Only cash balances can be manually edited.
                    </Alert>
                )}

                {!userPlaidStatus.hasPlaid && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        You can manually edit all your account balances. Connect to Plaid for automatic bank account syncing.
                    </Alert>
                )}

                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountBalanceIcon color="primary" />
                    Account Overview
                </Typography>

                <Stack spacing={2}>
                    {/* Checking Account */}
                    <Card variant="outlined" sx={{ 
                        backgroundColor: userPlaidStatus.hasPlaid ? '#f8f9fa' : '#fefefe',
                        borderColor: userPlaidStatus.hasPlaid ? undefined : '#2563eb'
                    }}>
                        <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AccountBalanceIcon fontSize="small" color="primary" />
                                    <Typography variant="body2">Checking Account</Typography>
                                    {userPlaidStatus.hasPlaid && (
                                        <Chip label="Plaid" size="small" color="primary" variant="outlined" />
                                    )}
                                    {!userPlaidStatus.hasPlaid && (
                                        <Chip label="Editable" size="small" color="primary" variant="outlined" />
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {!userPlaidStatus.hasPlaid && isEditingChecking ? (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <TextField
                                                type="number"
                                                value={checkingInput}
                                                onChange={(e) => setCheckingInput(parseFloat(e.target.value) || 0)}
                                                size="small"
                                                sx={{ width: 120 }}
                                                placeholder="0.00"
                                                inputProps={{ step: '0.01', min: '0' }}
                                            />
                                            <IconButton
                                                onClick={handleCheckingUpdate}
                                                size="small"
                                                sx={{ color: 'success.main' }}
                                            >
                                                <CheckIcon />
                                            </IconButton>
                                        </Stack>
                                    ) : (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 60 }}>
                                                ${balances.checking?.toFixed(2) || "0.00"}
                                            </Typography>
                                            {!userPlaidStatus.hasPlaid && (
                                                <IconButton
                                                    onClick={() => {
                                                        setIsEditingChecking(true);
                                                        setCheckingInput(balances.checking || 0);
                                                    }}
                                                    size="small"
                                                    sx={{ color: 'primary.main' }}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            )}
                                        </Stack>
                                    )}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Savings Account */}
                    <Card variant="outlined" sx={{ 
                        backgroundColor: userPlaidStatus.hasPlaid ? '#f8f9fa' : '#fefefe',
                        borderColor: userPlaidStatus.hasPlaid ? undefined : '#2563eb'
                    }}>
                        <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <SavingsIcon fontSize="small" color="success" />
                                    <Typography variant="body2">Savings Account</Typography>
                                    {userPlaidStatus.hasPlaid && (
                                        <Chip label="Plaid" size="small" color="primary" variant="outlined" />
                                    )}
                                    {!userPlaidStatus.hasPlaid && (
                                        <Chip label="Editable" size="small" color="primary" variant="outlined" />
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {!userPlaidStatus.hasPlaid && isEditingSavings ? (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <TextField
                                                type="number"
                                                value={savingsInput}
                                                onChange={(e) => setSavingsInput(parseFloat(e.target.value) || 0)}
                                                size="small"
                                                sx={{ width: 120 }}
                                                placeholder="0.00"
                                                inputProps={{ step: '0.01', min: '0' }}
                                            />
                                            <IconButton
                                                onClick={handleSavingsUpdate}
                                                size="small"
                                                sx={{ color: 'success.main' }}
                                            >
                                                <CheckIcon />
                                            </IconButton>
                                        </Stack>
                                    ) : (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 60 }}>
                                                ${balances.savings?.toFixed(2) || "0.00"}
                                            </Typography>
                                            {!userPlaidStatus.hasPlaid && (
                                                <IconButton
                                                    onClick={() => {
                                                        setIsEditingSavings(true);
                                                        setSavingsInput(balances.savings || 0);
                                                    }}
                                                    size="small"
                                                    sx={{ color: 'primary.main' }}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            )}
                                        </Stack>
                                    )}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Cash - Always Editable */}
                    <Card variant="outlined" sx={{ borderColor: '#2563eb', backgroundColor: '#fefefe' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AttachMoneyIcon fontSize="small" sx={{ color: '#2563eb' }} />
                                    <Typography variant="body2">Cash</Typography>
                                    <Chip label="Editable" size="small" color="primary" variant="outlined" />
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {isEditingCash ? (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <TextField
                                                type="number"
                                                value={cashInput}
                                                onChange={(e) => setCashInput(parseFloat(e.target.value) || 0)}
                                                size="small"
                                                sx={{ width: 120 }}
                                                placeholder="0.00"
                                                inputProps={{ step: '0.01', min: '0' }}
                                            />
                                            <IconButton
                                                onClick={handleCashUpdate}
                                                size="small"
                                                sx={{ color: 'success.main' }}
                                            >
                                                <CheckIcon />
                                            </IconButton>
                                        </Stack>
                                    ) : (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 60 }}>
                                                ${balances.cash?.toFixed(2) || "0.00"}
                                            </Typography>
                                            <IconButton
                                                onClick={() => {
                                                    setIsEditingCash(true);
                                                    setCashInput(balances.cash || 0);
                                                }}
                                                size="small"
                                                sx={{ color: 'primary.main' }}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </Stack>
                                    )}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Stack>
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
            </DialogActions>
        </Dialog>
    );
};

export default EditAccounts;
