import React, { useState } from "react";
import "../../../../components/popups/modal.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil } from "@fortawesome/free-solid-svg-icons";
import "./manbud.scss";

const ManageBudgets = ({ onClose }) => {
    const [annualBudget, setAnnualBudget] = useState({
        name: "Annual Budget",
        amount: 50000, //this is hardcoded for now, but will be pulled from database
        current: 45000,
    });

    const [categories, setCategories] = useState([
        { id: 1, name: "Entertainment", current: 4000, actual: 3500 },
        { id: 2, name: "Food", current: 8000, actual: 7500 },
        { id: 3, name: "Utilities", current: 2000, actual: 1800 },
        { id: 4, name: "Transportation", current: 1500, actual: 1400 },
    ]);

    //need to make editing annual budget, we only want to edit the annual goal
    const [isEditingAnnual, setIsEditingAnnual] = useState(false);
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState({
        name: "",
        current: 0, //current budget
        actual: 0, //actual USED & working, it's a bit confusing just from reading it
    });

    const handleAnnualEdit = (e) => {
        e.preventDefault();
        setIsEditingAnnual(false);
    }
    const handleCategoryEdit = (e) => {
        e.preventDefault();
        setIsEditingCategory(false);
    }
    const handleAddCategory = (e) => {
        e.preventDefault();
        setIsAddingCategory(false);
        setCategories((prev) => [
            ...prev,
            {
                id: categories.length + 1,
                name: newCategory.name,
                current: newCategory.current,
                actual: newCategory.actual,
            },
        ]);
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
                                    <button className="edit-btn" 
                                    onClick={() => setIsEditingAnnual(true)}
                                    >
                                        <FontAwesomeIcon icon={faPencil} />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </div>
                    
                    {/* <p>{annualBudget.name}</p> */}
                    {/* <p>${annualBudget.current} / ${annualBudget.amount}</p> */}
                    {/* <form>
                        <div className="form-group">
                            <label>Budget Name:</label>
                            <input type="text" placeholder="Enter budget name" />
                        </div>
                        <div className="form-group">
                            <label>Amount:</label>
                            <input type="number" placeholder="Enter budget amount" />
                        </div>
                        <button type="submit">Save</button>
                    </form> */}
                </div>

                <BudgetGoals
                    categories={categories}
                    setCategories={setCategories}
                    isEditingCategory={isEditingCategory}
                    setIsEditingCategory={setIsEditingCategory}
                    handleCategoryEdit={handleCategoryEdit}
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
                        <th>Monthly Goal</th>
                        <th>Working</th>
                        <th>Remainder</th>
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
                                        value={category.actual}
                                        onChange={(e) =>
                                            setCategories((prev) =>
                                                prev.map((cat) =>
                                                    cat.id === category.id
                                                        ? { ...cat, actual: parseInt(e.target.value) }
                                                        : cat
                                                )
                                            )
                                        }
                                    />
                                </td>
                                <td>${category.current.toLocaleString()}</td>
                                <td>${(category.current - category.actual).toLocaleString()}</td>
                                <td>
                                    <button
                                        type="submit"
                                        className="save-btn"
                                        onClick={(e) => handleCategoryEdit(e, category.id)}
                                    >
                                        Save
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            <tr key={category.id}>
                                <td>{category.name}</td>
                                <td>${category.current.toLocaleString()}</td>
                                <td>${category.actual.toLocaleString()}</td>
                                <td>${(category.current - category.actual).toLocaleString()}</td>
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
                                    placeholder="Name"
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
                                    placeholder="Monthly Goal"
                                    className="budget-input"
                                    value={newCategory.actual}
                                    onChange={(e) =>
                                        setNewCategory((prev) => ({ ...prev, actual: parseInt(e.target.value) }))
                                    }
                                />
                            </td>
                            <td>-</td>
                            <td>-</td>
                            <td>
                                <button
                                    type="submit"
                                    className="save-btn"
                                    onClick={handleAddCategory}
                                >
                                    Save
                                </button>
                            </td>
                            <td>
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

            {/* Add Category Button */}
            {!isAddingCategory && (
                <button
                    className="add-category-btn"
                    onClick={() => setIsAddingCategory(true)}
                >
                    +
                </button>
            )}
        </div>
    );
};


export default ManageBudgets;