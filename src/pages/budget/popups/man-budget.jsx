import React, { useState } from "react";
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
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil } from "@fortawesome/free-solid-svg-icons";

const ManageBudgets = ({ onClose }) => {
    const [annualBudget, setAnnualBudget] = useState({
        name: "Annual Budget",
        amount: 50000,
        current: 45000,
    });

    const [categories, setCategories] = useState([
        { id: 1, name: "Entertainment", current: 4000, actual: 3500 },
        { id: 2, name: "Food", current: 8000, actual: 7500 },
        { id: 3, name: "Utilities", current: 2000, actual: 1800 },
        { id: 4, name: "Transportation", current: 1500, actual: 1400 },
    ]);

    const [isEditingAnnual, setIsEditingAnnual] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: "", current: 0, actual: 0 });

    // Predefined category options
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

    const handleAnnualEdit = (e) => {
        e.preventDefault();
        setIsEditingAnnual(false);
    };

    const handleAddCategory = (e) => {
        e.preventDefault();
        setCategories((prev) => [
            ...prev,
            {
                id: categories.length + 1,
                name: newCategory.name,
                current: newCategory.current,
                actual: newCategory.actual,
            },
        ]);
        setNewCategory({ name: "", current: 0, actual: 0 });
    };

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
                <Typography variant="h6" sx={{ mb: 1 }}>Annual Savings Goal:</Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, py: 1 }}>Annual Goal</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1 }}>Working</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1 }}>Remainder</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1 }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            {isEditingAnnual ? (
                                <TableCell sx={{ py: 1 }}>
                                    <form onSubmit={handleAnnualEdit}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <TextField
                                                type="number"
                                                value={annualBudget.amount}
                                                onChange={(e) =>
                                                    setAnnualBudget((prev) => ({
                                                        ...prev,
                                                        amount: parseInt(e.target.value) || 0,
                                                    }))
                                                }
                                                size="small"
                                                sx={{ width: 120 }}
                                            />
                                            <Button 
                                                type="submit" 
                                                size="small" 
                                                variant="contained"
                                                sx={{ 
                                                    backgroundColor: '#2563eb',
                                                    minWidth: 60,
                                                    '&:hover': { backgroundColor: '#1d4ed8' }
                                                }}
                                            >
                                                Save
                                            </Button>
                                        </Stack>
                                    </form>
                                </TableCell>
                            ) : (
                                <TableCell sx={{ py: 1, fontWeight: 500 }}>${annualBudget.amount.toLocaleString()}</TableCell>
                            )}
                            <TableCell sx={{ py: 1 }}>${annualBudget.current.toLocaleString()}</TableCell>
                            <TableCell sx={{ py: 1, color: annualBudget.amount - annualBudget.current >= 0 ? 'success.main' : 'error.main' }}>
                                ${(annualBudget.amount - annualBudget.current).toLocaleString()}
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                                <IconButton 
                                    onClick={() => setIsEditingAnnual(true)} 
                                    size="small"
                                    sx={{ color: '#2563eb' }}
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
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
                            <TableCell sx={{ fontWeight: 600, py: 1 }}>Monthly Goal</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1 }}>Current Spent</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1 }}>Remaining</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {categories.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell sx={{ py: 1, fontWeight: 500 }}>{category.name}</TableCell>
                                <TableCell sx={{ py: 1 }}>${category.current.toLocaleString()}</TableCell>
                                <TableCell sx={{ py: 1 }}>${category.actual.toLocaleString()}</TableCell>
                                <TableCell sx={{ 
                                    py: 1, 
                                    color: category.current - category.actual >= 0 ? 'success.main' : 'error.main',
                                    fontWeight: 500
                                }}>
                                    ${(category.current - category.actual).toLocaleString()}
                                </TableCell>
                            </TableRow>
                        ))}
                        {categories.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} sx={{ py: 2, textAlign: 'center', color: 'text.secondary', fontStyle: 'italic' }}>
                                    No categories added yet. Add your first category below!
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                <Box sx={{ mt: 2, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                        Add New Category
                    </Typography>
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
                                label="Monthly Goal ($)"
                                type="number"
                                value={newCategory.current}
                                onChange={(e) =>
                                    setNewCategory((prev) => ({ ...prev, current: parseInt(e.target.value) || 0 }))
                                }
                                size="small"
                                sx={{ minWidth: 140 }}
                            />
                            <Button 
                                type="submit" 
                                variant="contained" 
                                disabled={!newCategory.name || newCategory.current <= 0}
                                sx={{
                                    backgroundColor: '#2563eb',
                                    minWidth: 120,
                                    '&:hover': {
                                        backgroundColor: '#1d4ed8'
                                    }
                                }}
                            >
                                Add Category
                            </Button>
                        </Stack>
                    </form>
                </Box>
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

export default ManageBudgets;