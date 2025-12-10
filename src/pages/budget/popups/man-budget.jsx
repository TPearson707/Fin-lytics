import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    Stack,
    Snackbar,
    Alert,
    CircularProgress,
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import axios from "axios";

const ManageBudgets = ({ onClose }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [newCategory, setNewCategory] = useState({ name: "", weekly_limit: 0 });
    const [monthlySpending, setMonthlySpending] = useState({});
    const [annualSpending, setAnnualSpending] = useState(0);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", weekly_limit: 0, color: "" });
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    // Annual goal editing
    const [editingAnnualGoal, setEditingAnnualGoal] = useState(false);
    const [annualGoalInput, setAnnualGoalInput] = useState(0);
    // Hide/show add category
    const [showAddCategory, setShowAddCategory] = useState(false);

    //category options
    const commonCategories = [
        "Food & Dining",
        "Entertainment", 
        "Transportation",
        "Utilities",
        "Healthcare",
        "Shopping",
        "Travel",
        "Education",
        "Insurance",
        "Personal Care",
        "Subscriptions",
        "Other"
    ];

    // Calculate annual goal based on sum of monthly limits
    const calculateAnnualGoal = () => {
        if (typeof annualGoalInput === 'number' && !editingAnnualGoal && annualGoalInput > 0) {
            return annualGoalInput;
        }
        return categories.reduce((total, category) => {
            return total + (category.weekly_limit || 0) * 12;
        }, 0);
    };

    // Save annual goal to backend
    const handleSaveAnnualGoal = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.post("http://localhost:8000/budget-goals/", {
                goal_type: "annual",
                goal_amount: annualGoalInput,
            }, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });
            setEditingAnnualGoal(false);
            setSnackbar({ open: true, message: "Annual goal updated!", severity: "success" });
        } catch (error) {
            setSnackbar({ open: true, message: "Failed to update annual goal.", severity: "error" });
        }
    };

    // Fetch spending data for categories
    const fetchSpendingData = async () => {
        try {
            const token = localStorage.getItem("token");
            const currentDate = new Date();
            const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
            
            // Make both API calls in parallel for faster loading
            const [yearResponse, monthlySpendingResponse] = await Promise.all([
                axios.get("http://localhost:8000/user_transactions/", {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                    params: {
                        start_date: startOfYear.toISOString().split('T')[0],
                        end_date: currentDate.toISOString().split('T')[0]
                    }
                }),
                // Use new spending summary endpoint for monthly data
                axios.get("http://localhost:8000/budget-goals/spending-summary", {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true
                })
            ]);

            // Process annual spending with optimized deduplication
            const { plaid_transactions: yearPlaid = [], db_transactions: yearDb = [], user_transactions: yearUser = [] } = yearResponse.data;
            const processedTransactionIds = new Set();
            
            const totalAnnualSpent = [...yearPlaid, ...yearDb, ...yearUser].reduce((total, transaction) => {
                if (processedTransactionIds.has(transaction.transaction_id)) {
                    return total;
                }
                processedTransactionIds.add(transaction.transaction_id);
                
                const amount = transaction.amount || 0;
                if (amount > 0 || transaction.source === 'user') {
                    return total + Math.abs(amount);
                }
                return total;
            }, 0);
            
            setAnnualSpending(totalAnnualSpent);

            // Use the spending summary data directly from the backend
            const monthlySpendingByCategory = monthlySpendingResponse.data;
            
            // Ensure all categories have a spending value (even if 0)
            categories.forEach(category => {
                if (!(category.name in monthlySpendingByCategory)) {
                    monthlySpendingByCategory[category.name] = 0;
                }
            });

            setMonthlySpending(monthlySpendingByCategory);

        } catch (error) {
            console.error("Error fetching spending data:", error);
            setAnnualSpending(0);
            const defaultSpending = {};
            categories.forEach(category => {
                defaultSpending[category.name] = 0;
            });
            setMonthlySpending(defaultSpending);
        }
    };

    const getCurrentUser = () => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.user_id || payload.sub;
            } catch (error) {
                console.error("Error parsing token:", error);
                return null;
            }
        }
        return null;
    };
    const fetchUserCategories = async () => {
        try {
            const token = localStorage.getItem("token");
            const currentUserId = getCurrentUser();
            
            if (!currentUserId) {
                console.error("No user ID found");
                setLoading(false);
                return;
            }

            setUserId(currentUserId);

            const response = await axios.get("http://localhost:8000/user_categories/", {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });

            setCategories(response.data);
            
            if (response.data.length > 0) {
                await fetchSpendingData();
            }
            
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setLoading(false);
        }
    };
    const handleAddCategory = async (e) => {
        e.preventDefault();
        
        if (!newCategory.name || newCategory.weekly_limit <= 0) {
            alert("Please enter a valid category name and monthly limit");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await axios.post("http://localhost:8000/user_categories/", {
                name: newCategory.name,
                color: "#4CAF50",
                weekly_limit: newCategory.weekly_limit
            }, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });

            await fetchUserCategories();
            setNewCategory({ name: "", weekly_limit: 0 });
            
        } catch (error) {
            console.error("Error creating category:", error);
            alert("Failed to create category. Please try again.");
        }
    };

    const handleUpdateCategory = async (categoryId, updatedData) => {
        try {
            const token = localStorage.getItem("token");
            await axios.put(`http://localhost:8000/user_categories/${categoryId}`, updatedData, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });

            await fetchUserCategories();
            
        } catch (error) {
            console.error("Error updating category:", error);
            alert("Failed to update category. Please try again.");
        }
    };
    const handleEditCategory = (category) => {
        setEditingCategory(category.id);
        setEditForm({
            name: category.name,
            weekly_limit: category.weekly_limit || 0,
            color: category.color || "#4CAF50"
        });
    };

    const handleSaveEdit = async (categoryId) => {
        try {
            await handleUpdateCategory(categoryId, editForm);
            setEditingCategory(null);
            setEditForm({ name: "", weekly_limit: 0, color: "" });
        } catch (error) {
            console.error("Error saving category edit:", error);
        }
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
        setEditForm({ name: "", weekly_limit: 0, color: "" });
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                await fetchUserCategories();
                // fetchSpendingData will be called after categories are loaded via the second useEffect
            } catch (error) {
                console.error('Error loading initial data:', error);
                setError('Failed to load categories. Please refresh the page.');
            }
        };
        
        loadInitialData();
    }, []);

    useEffect(() => {
        if (categories.length > 0) {
            fetchSpendingData();
        }
    }, [categories]);

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ position: 'relative', pb: 1 }}>
                Manage Budget Projections
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
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <Typography variant="h6" sx={{ mb: 1 }}>Annual Budget Overview:</Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Annual Goal</TableCell>
                                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Amount Spent (YTD)</TableCell>
                                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Remaining</TableCell>
                                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Categories</TableCell>
                                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell sx={{ py: 1, fontWeight: 500, fontSize: '1.1rem', color: 'primary.main' }}>
                                        {editingAnnualGoal ? (
                                            <TextField
                                                type="number"
                                                value={annualGoalInput}
                                                onChange={e => setAnnualGoalInput(Number(e.target.value))}
                                                size="small"
                                                sx={{ width: 120 }}
                                            />
                                        ) : (
                                            `$${calculateAnnualGoal().toLocaleString()}`
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ py: 1, fontWeight: 500, fontSize: '1.1rem' }}>
                                        ${annualSpending.toLocaleString()}
                                    </TableCell>
                                    <TableCell sx={{ 
                                        py: 1, 
                                        fontWeight: 500, 
                                        fontSize: '1.1rem',
                                        color: calculateAnnualGoal() - annualSpending >= 0 ? 'success.main' : 'error.main'
                                    }}>
                                        ${(calculateAnnualGoal() - annualSpending).toLocaleString()}
                                    </TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                        {categories.length} categories
                                    </TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                        {editingAnnualGoal ? (
                                            <Stack direction="row" spacing={1}>
                                                <IconButton onClick={handleSaveAnnualGoal} size="small" sx={{ color: 'success.main' }}>
                                                    <SaveIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton onClick={() => setEditingAnnualGoal(false)} size="small" sx={{ color: 'error.main' }}>
                                                    <CancelIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        ) : (
                                            <IconButton onClick={() => { setEditingAnnualGoal(true); setAnnualGoalInput(calculateAnnualGoal()); }} size="small" sx={{ color: '#2563eb' }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>

                        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                            Categorical Budget Goals:
                        </Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Monthly Limit</TableCell>
                                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Spent This Month</TableCell>
                                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Remaining</TableCell>
                                    <TableCell sx={{ fontWeight: 600, py: 1 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {categories.map((category) => (
                                    <TableRow key={category.id}>
                                        {editingCategory === category.id ? (
                                            // Editing mode
                                            <>
                                                <TableCell sx={{ py: 1 }}>
                                                    <TextField
                                                        value={editForm.name}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                        size="small"
                                                        sx={{ minWidth: 120 }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ py: 1 }}>
                                                    <TextField
                                                        type="number"
                                                        value={editForm.weekly_limit}
                                                        onChange={(e) => setEditForm(prev => ({ 
                                                            ...prev, 
                                                            weekly_limit: parseFloat(e.target.value) || 0 
                                                        }))}
                                                        size="small"
                                                        sx={{ width: 100 }}
                                                        inputProps={{ step: '0.01', min: '0' }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ py: 1 }}>
                                                    ${(monthlySpending[category.name] || 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell sx={{ 
                                                    py: 1, 
                                                    color: editForm.weekly_limit - (monthlySpending[category.name] || 0) >= 0 ? 'success.main' : 'error.main',
                                                    fontWeight: 500
                                                }}>
                                                    ${(editForm.weekly_limit - (monthlySpending[category.name] || 0)).toLocaleString()}
                                                </TableCell>
                                                <TableCell sx={{ py: 1 }}>
                                                    <Stack direction="row" spacing={1}>
                                                        <IconButton
                                                            onClick={() => handleSaveEdit(category.id)}
                                                            size="small"
                                                            sx={{ color: 'success.main' }}
                                                        >
                                                            <SaveIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            onClick={handleCancelEdit}
                                                            size="small"
                                                            sx={{ color: 'error.main' }}
                                                        >
                                                            <CancelIcon fontSize="small" />
                                                        </IconButton>
                                                    </Stack>
                                                </TableCell>
                                            </>
                                        ) : (
                                            // View mode
                                            <>
                                                <TableCell sx={{ py: 1, fontWeight: 500 }}>{category.name}</TableCell>
                                                <TableCell sx={{ py: 1 }}>
                                                    ${(category.weekly_limit || 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell sx={{ py: 1 }}>
                                                    ${(monthlySpending[category.name] || 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell sx={{ 
                                                    py: 1, 
                                                    color: (category.weekly_limit || 0) - (monthlySpending[category.name] || 0) >= 0 ? 'success.main' : 'error.main',
                                                    fontWeight: 500
                                                }}>
                                                    ${((category.weekly_limit || 0) - (monthlySpending[category.name] || 0)).toLocaleString()}
                                                </TableCell>
                                                <TableCell sx={{ py: 1 }}>
                                                    <IconButton
                                                        onClick={() => handleEditCategory(category)}
                                                        size="small"
                                                        sx={{ color: '#2563eb' }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))}
                                {categories.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} sx={{ py: 2, textAlign: 'center', color: 'text.secondary', fontStyle: 'italic' }}>
                                            No categories added yet. Add your first category below!
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <Box sx={{ mt: 2, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                            {/* <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                                Add New Category
                            </Typography> */}
                            {!showAddCategory && (
                                <Button 
                                    variant="outlined"
                                    onClick={() => setShowAddCategory(true)}
                                    sx={{ minWidth: 160 }}
                                >
                                    Add Category
                                </Button>
                            )}
                            {showAddCategory && (
                                <form onSubmit={handleAddCategory}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="end">
                                        <FormControl size="small" sx={{ minWidth: 200 }}>
                                            <InputLabel>Category</InputLabel>
                                            <Select
                                                value={newCategory.name}
                                                label="Category"
                                                onChange={(e) =>
                                                    setNewCategory((prev) => ({ ...prev, name: e.target.value }))
                                                }
                                            >
                                                {commonCategories.map((category) => (
                                                    <MenuItem key={category} value={category}>
                                                        {category}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            label="Monthly Limit ($)"
                                            type="number"
                                            value={newCategory.weekly_limit}
                                            onChange={(e) =>
                                                setNewCategory((prev) => ({ ...prev, weekly_limit: parseFloat(e.target.value) || 0 }))
                                            }
                                            size="small"
                                            sx={{ minWidth: 140 }}
                                            inputProps={{ step: '0.01', min: '0' }}
                                        />
                                        <Button 
                                            type="submit" 
                                            variant="contained" 
                                            disabled={!newCategory.name || newCategory.weekly_limit <= 0}
                                            sx={{
                                                backgroundColor: '#2563eb',
                                                minWidth: 120,
                                                '&:hover': {
                                                    backgroundColor: '#1d4ed8'
                                                }
                                            }}
                                        >
                                            Add
                                        </Button>
                                        <Button
                                            variant="text"
                                            onClick={() => setShowAddCategory(false)}
                                            sx={{ minWidth: 80 }}
                                        >
                                            Cancel
                                        </Button>
                                    </Stack>
                                </form>
                            )}
                        </Box>
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
            </DialogActions>
            
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Dialog>
    );
};

export default ManageBudgets;