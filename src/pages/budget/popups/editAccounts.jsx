import React, { useState, useEffect } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil, faCheck } from "@fortawesome/free-solid-svg-icons";
import "./editAcc.scss";

const EditAccounts = ({ onClose }) => {
    const [balances, setBalances] = useState({
        checking: 0,
        savings: 0,
        debit: 0,
        credit: 0,
        cash: 0,
    });
    const [cashInput, setCashInput] = useState(0);
    const [isEditingCash, setIsEditingCash] = useState(false); // State to toggle edit mode

    const getUserIdFromToken = () => {
        const token = localStorage.getItem("token");
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split('.')[1])); // Decode the JWT payload
            return payload.id; // Assuming the token contains the user ID as `id`
        } catch (error) {
            console.error("Error decoding token:", error);
            return null;
        }
    };

    const fetchBalances = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://localhost:8000/user_balances/", {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });

            const { plaid_balances, cash_balance } = response.data;

            console.log("Fetched cash balance:", cash_balance); // Debugging

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

            console.log("Updated balances:", balances);
        } catch (error) {
            console.error("Error fetching user balances:", error.response ? error.response.data : error);
        }
    };

    useEffect(() => {
        fetchBalances();
    }, []);

    const handleCashUpdate = async () => {
        try {
            const userId = getUserIdFromToken(); // Get userId from the token
            if (!userId) {
                console.error("User ID not found. Please log in.");
                alert("User ID not found. Please log in.");
                return;
            }
            console.log("Checkmark clicked!"); // Debugging
            console.log("Cash input value:", cashInput); // Debugging
            console.log("User ID:", userId); // Debugging
    
            const token = localStorage.getItem("token");
            await axios.post(
                "http://localhost:8000/user_balances/update_cash_balance/",
                { cash_balance: cashInput },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                }
            );
    
            console.log("Cash balance updated successfully!"); // Debugging
            alert("Cash balance updated successfully");
    
            // Refetch balances to ensure the updated value is displayed
            await fetchBalances();
    
            setIsEditingCash(false); // Exit edit mode
        } catch (error) {
            console.error("Error updating cash balance:", error.response ? error.response.data : error);
        }
    };

    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    x
                </button>
                <h2>Edit Accounts</h2>
                <p>View and manage your account balances.</p>
                <div className="account-list">
                    <ul className="al-ul1">
                        <li className="al-item">
                            <strong>Checking:</strong>&nbsp;${balances.checking?.toFixed(2) || "0.00"}
                        </li>
                        <li className="al-item">
                            <strong>Savings:</strong>&nbsp;${balances.savings?.toFixed(2) || "0.00"}
                        </li>
                        <li className="al-item1">
                            <strong>Debit Total:</strong>&nbsp;${balances.debit?.toFixed(2) || "0.00"}
                        </li>
                    </ul>

                    <ul>
                        <li className="al-item">
                            <strong>Credit:</strong>&nbsp;${balances.credit?.toFixed(2) || "0.00"}
                        </li>
                    </ul>
                    <ul className="al-ul2">
                        <li className="al-item">
                            <strong>Cash:</strong>&nbsp;${isEditingCash ? (
                                <input
                                    type="number"
                                    value={cashInput}
                                    onChange={(e) => setCashInput(parseFloat(e.target.value) || 0)}
                                />
                            ) : (
                                balances.cash?.toFixed(2) || "0.00"
                            )}
                        </li>
                        <div className="edit-btn-container">
                            <button
                                onClick={() => {
                                    if (isEditingCash) {
                                        handleCashUpdate();
                                    } else {
                                        setIsEditingCash(true);
                                    }
                                }}
                                className="edit-btn"
                            >
                                <FontAwesomeIcon icon={isEditingCash ? faCheck : faPencil} />
                            </button>
                        </div>
                    </ul>
                    <ul>
                        <li className="al-item1">
                            <strong>Total:</strong>&nbsp;${balances.debit?.toFixed(2) || "0.00"}
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default EditAccounts;