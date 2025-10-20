import React, { useState, useEffect } from "react";
import "../../../../components/popups/modal.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil } from "@fortawesome/free-solid-svg-icons";
import "./manBud.scss";
import api from "../../../../api";

const ManageBudgets = ({ onClose }) => {
    const [annualBudget, setAnnualBudget] = useState({
        name: "Annual Budget",
        amount: 50000,
        current: 45000,
    });

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isEditingAnnual, setIsEditingAnnual] = useState(false);
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState({
        name: "",
        weekly_limit: 0,
    });

    // Get user ID from token
    const getUserIdFromToken = () => {
        const token = localStorage.getItem("token");
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.id;
        } catch (error) {
            return null;
        }
    };

    // Fetch user's categories with weekly spent from backend
    const fetchCategories = async () => {
        try {
            setLoading(true);
            const userId = getUserIdFromToken();
            if (!userId) throw new Error("User not authenticated");
            const response = await api.get(`/user_categories/${userId}/weekly_spent`);
            setCategories(response.data);
        } catch (error) {
            console.error("Error fetching categories:", error);
            setError("Failed to load categories");
        } finally {
            setLoading(false);
        }
    };

    // Create new category
    const handleAddCategory = async (e) => {
        e.preventDefault();
        try {
            const userId = getUserIdFromToken();
            if (!userId) throw new Error("User not authenticated");

            const response = await api.post("/user_categories/", {
                user_id: userId,
                name: newCategory.name,
                weekly_limit: newCategory.weekly_limit,
                color: "#000000"
            });

            setCategories((prev) => [...prev, response.data]);
            setNewCategory({ name: "", weekly_limit: 0 });
            setIsAddingCategory(false);
        } catch (error) {
            console.error("Error creating category:", error);
            setError("Failed to create category: " + (error.response?.data?.detail || error.message));
        }
    };

    // Update category
    const handleCategoryEdit = async (e, categoryId) => {
        e.preventDefault();
        try {
            const category = categories.find(cat => cat.id === categoryId);
            if (!category) return;

            const response = await api.put(`/user_categories/${categoryId}`, {
                name: category.name,
                weekly_limit: category.weekly_limit,
                color: category.color
            });

            setCategories((prev) =>
                prev.map((cat) => (cat.id === categoryId ? response.data : cat))
            );
            setIsEditingCategory(false);
        } catch (error) {
            console.error("Error updating category:", {
                message: error.message,
                response: error.response,
                request: error.request,
                config: error.config
            });
            setError("Failed to update category: " + (error.response?.data?.detail || error.message));
        }
    };

    // Delete category
    const handleDeleteCategory = async (categoryId) => {
        try {
            await api.delete(`/user_categories/${categoryId}`);
            setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
        } catch (error) {
            console.error("Error deleting category:", error);
            setError("Failed to delete category");
        }
    };

    const handleAnnualEdit = (e) => {
        e.preventDefault();
        setIsEditingAnnual(false);
    }

    // Load categories on component mount
    useEffect(() => {
        fetchCategories();
    }, []);

    if (loading) {
        return <div>Loading categories...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>{error}</div>;
    }

    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    x
                </button>
                <h2>Manage Budget Projections</h2>

                <div className="annual-budget">
                    <h3>Annual Savings Goal:</h3>
                    
                    <div className="budget-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Annual Goal</th>
                                    <th>Working</th>
                                    <th>Remainder</th>
                                    <th>Edit</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {isEditingAnnual ? (
                                        <td>
                                            <form onSubmit={handleAnnualEdit}>
                                                <input
                                                    className="budget-input"
                                                    type="number"
                                                    value={annualBudget.amount}
                                                    onChange={(e) =>
                                                        setAnnualBudget((prev) => ({ ...prev, amount: parseInt(e.target.value) }))
                                                    }
                                                />
                                                <button type="submit" className="save-btn">
                                                    ↵
                                                </button>
                                            </form>
                                        </td>
                                    ) : (
                                        <td>${annualBudget.amount}</td>
                                    )}
                                    <td>${annualBudget.current}</td>
                                    <td>${annualBudget.amount - annualBudget.current}</td>
                                    <td>
                                        <button 
                                            className="edit-btn" 
                                            onClick={() => setIsEditingAnnual(true)}
                                        >
                                            <FontAwesomeIcon icon={faPencil} />
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <BudgetGoals
                    categories={categories}
                    setCategories={setCategories}
                    isEditingCategory={isEditingCategory}
                    setIsEditingCategory={setIsEditingCategory}
                    handleCategoryEdit={handleCategoryEdit}
                    handleDeleteCategory={handleDeleteCategory}
                    isAddingCategory={isAddingCategory}
                    setIsAddingCategory={setIsAddingCategory}
                    newCategory={newCategory}
                    setNewCategory={setNewCategory}
                    handleAddCategory={handleAddCategory}
                />
            </div>
        </div>
    );
};

const BudgetGoals = ({
    categories,
    setCategories,
    isEditingCategory,
    setIsEditingCategory,
    handleCategoryEdit,
    handleDeleteCategory,
    isAddingCategory,
    setIsAddingCategory,
    newCategory,
    setNewCategory,
    handleAddCategory,
}) => {
    return (
        <div className="categorical-budget">
            <h3>Categorical Budget Goals:</h3>
            <table className="budget-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Weekly Goal</th>
                        <th>Amount Spent</th>
                        <th>Amount Remaining</th>
                        <th>Edit</th>
                    </tr>
                </thead>
                <tbody>
                    {categories.map((category) =>
                        isEditingCategory === category.id ? (
                            <tr key={category.id}>
                                <td>
                                    <input
                                        type="text"
                                        className="budget-input"
                                        value={category.name}
                                        onChange={(e) =>
                                            setCategories((prev) =>
                                                prev.map((cat) =>
                                                    cat.id === category.id ? { ...cat, name: e.target.value } : cat
                                                )
                                            )
                                        }
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="budget-input"
                                        value={category.weekly_limit}
                                        onChange={(e) =>
                                            setCategories((prev) =>
                                                prev.map((cat) =>
                                                    cat.id === category.id
                                                        ? { ...cat, weekly_limit: parseFloat(e.target.value) || 0 }
                                                        : cat
                                                )
                                            )
                                        }
                                    />
                                </td>
                                <td>${category.amount_spent?.toLocaleString() ?? 0}</td>
                                <td>${category.amount_remaining?.toLocaleString() ?? 0}</td>
                                <td>
                                    <button
                                        type="submit"
                                        className="save-btn"
                                        onClick={(e) => handleCategoryEdit(e, category.id)}
                                    >
                                        Save
                                    </button>
                                    <button
                                        className="cancel-btn"
                                        onClick={() => setIsEditingCategory(false)}
                                    >
                                        Cancel
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            <tr key={category.id}>
                                <td>{category.name}</td>
                                <td>${category.weekly_limit.toLocaleString()}</td>
                                <td>${category.amount_spent?.toLocaleString() ?? 0}</td>
                                <td>${category.amount_remaining?.toLocaleString() ?? 0}</td>
                                <td>
                                    <button
                                        className="edit-btn"
                                        onClick={() => setIsEditingCategory(category.id)}
                                    >
                                        <FontAwesomeIcon icon={faPencil} />
                                    </button>
                                </td>
                            </tr>
                        )

                    )}

                    {isAddingCategory && (
                        <tr>
                            <td>
                                <input
                                    type="text"
                                    placeholder="Category Name"
                                    className="budget-input"
                                    value={newCategory.name}
                                    onChange={(e) =>
                                        setNewCategory((prev) => ({ ...prev, name: e.target.value }))
                                    }
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    placeholder="Weekly Goal"
                                    className="budget-input"
                                    value={newCategory.weekly_limit}
                                    onChange={(e) =>
                                        setNewCategory((prev) => ({ ...prev, weekly_limit: parseFloat(e.target.value)}))
                                    }
                                />
                            </td>
                            <td>
                                <button
                                    type="submit"
                                    className="save-btn"
                                    onClick={handleAddCategory}
                                >
                                    Save
                                </button>
                                <button
                                    className="x-btn"
                                    onClick={() => setIsAddingCategory(false)}
                                >
                                    x
                                </button>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {!isAddingCategory && (
                <button
                    className="add-category-btn"
                    onClick={() => setIsAddingCategory(true)}
                >
                    + Add Category
                </button>
            )}
        </div>
    );
};

export default ManageBudgets;