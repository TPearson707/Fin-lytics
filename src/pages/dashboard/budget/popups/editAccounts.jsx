import React, { useState, useEffect } from "react";
import axios from "axios";
import "../../../../components/popups/modal.scss";

const EditAccounts = ({ onClose }) => {
    const [balances, setBalances] = useState({ debit: 0, credit: 0, cash: 0 });
    const [cashInput, setCashInput] = useState(0);

    useEffect(() => {
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

                const credit = plaid_balances
                    .filter(account => account.type === "credit")
                    .reduce((sum, account) => sum + (account.balance || 0), 0);

                setBalances({ debit, credit, cash: cash_balance });
                setCashInput(cash_balance);
            } catch (error) {
                console.error("Error fetching user balances:", error.response ? error.response.data : error);
            }
        };

        fetchBalances();
    }, []);

    const handleCashUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                "http://localhost:8000/update_cash_balance/",
                { cash_balance: cashInput },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                }
            );
            setBalances((prev) => ({ ...prev, cash: cashInput }));
            alert("Cash balance updated successfully");
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
                <ul>
                    <li>Debit (Savings & Checking): ${balances.debit.toFixed(2)}</li>
                    <li>Credit: ${balances.credit.toFixed(2)}</li>
                    <li>Cash: ${balances.cash.toFixed(2)}</li>
                </ul>
                <form onSubmit={handleCashUpdate}>
                    <label>
                        Update Cash Balance:
                        <input
                            type="number"
                            value={cashInput}
                            onChange={(e) => setCashInput(parseFloat(e.target.value) || 0)}
                        />
                    </label>
                    <button type="submit">Update</button>
                </form>
            </div>
        </div>
    );
};

export default EditAccounts;