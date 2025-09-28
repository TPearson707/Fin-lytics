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
} from "@mui/material";
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
            <DialogTitle>Manage Budget Projections</DialogTitle>
            <DialogContent>
                <Typography variant="h6">Annual Savings Goal:</Typography>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Annual Goal</TableCell>
                            <TableCell>Working</TableCell>
                            <TableCell>Remainder</TableCell>
                            <TableCell>Edit</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            {isEditingAnnual ? (
                                <TableCell>
                                    <form onSubmit={handleAnnualEdit}>
                                        <TextField
                                            type="number"
                                            value={annualBudget.amount}
                                            onChange={(e) =>
                                                setAnnualBudget((prev) => ({
                                                    ...prev,
                                                    amount: parseInt(e.target.value),
                                                }))
                                            }
                                            size="small"
                                        />
                                        <Button type="submit">Save</Button>
                                    </form>
                                </TableCell>
                            ) : (
                                <TableCell>${annualBudget.amount}</TableCell>
                            )}
                            <TableCell>${annualBudget.current}</TableCell>
                            <TableCell>${annualBudget.amount - annualBudget.current}</TableCell>
                            <TableCell>
                                <IconButton onClick={() => setIsEditingAnnual(true)}>
                                    <FontAwesomeIcon icon={faPencil} />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <Typography variant="h6" sx={{ marginTop: 2 }}>
                    Categorical Budget Goals:
                </Typography>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Category</TableCell>
                            <TableCell>Monthly Goal</TableCell>
                            <TableCell>Working</TableCell>
                            <TableCell>Remainder</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {categories.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell>{category.name}</TableCell>
                                <TableCell>${category.current}</TableCell>
                                <TableCell>${category.actual}</TableCell>
                                <TableCell>${category.current - category.actual}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <form onSubmit={handleAddCategory} style={{ marginTop: 16 }}>
                    <TextField
                        label="Category Name"
                        value={newCategory.name}
                        onChange={(e) =>
                            setNewCategory((prev) => ({ ...prev, name: e.target.value }))
                        }
                        size="small"
                        style={{ marginRight: 8 }}
                    />
                    <TextField
                        label="Monthly Goal"
                        type="number"
                        value={newCategory.current}
                        onChange={(e) =>
                            setNewCategory((prev) => ({ ...prev, current: parseInt(e.target.value) }))
                        }
                        size="small"
                        style={{ marginRight: 8 }}
                    />
                    <Button type="submit" variant="contained" color="primary">
                        Add Category
                    </Button>
                </form>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ManageBudgets;