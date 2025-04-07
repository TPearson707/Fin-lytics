import "./budget.scss"
import React from "react";
// import QuickAccess from "./cards/quickaccess.jsx" removed since logic will probably be simple enough to leave in parent
import WeeklyOverview from "./cards/weekly/weekly.jsx"
import VisualCard from "./cards/visualdata.jsx"
// import MyAccountsCard from "./cards/myaccounts.jsx"
import ProjectionsCard from "./cards/projections.jsx"
import TransactionCard from "./cards/transactions.jsx"

const Budget = () => {
    return (
        <div className="page-container">
                <h2>Budget Manager</h2>
            <div className="budget-content">
                    <div className="quick-card">
                        <div className="card-title">Quick Access</div>
                        <QuickAccess/>
                    </div>

                    <div className="week-card">
                        <div className="card-title">Weekly Overview</div>
                        <WeeklyOverview/>
                    </div>

                    <div className="visual-card">
                        <div className="card-title">Data Analytics</div>
                        <VisualCard/>
                    </div>

                    <div className="myaccounts-card">
                        <div className="card-title">My Accounts</div>
                        <MyAccounts/>
                    </div>
                    
                    <div className="projections-card">
                        <div className="card-title">Budget Projections</div>
                        <ProjectionsCard/>
                    </div>

                    <div className="transactions-card">
                        <div className="card-title">Recent Transactions</div>
                        <TransactionCard/>
                    </div>
            </div>
        </div>
    )
}

export default Budget;

const QuickAccess = () => { //need to open modal for each button
    return (
        <div className="card-content">
            <div className="card-body">
                <button>Edit Transactions</button>
                <button>Manage Budget</button>
                <button>Edit Accounts</button>
            </div>
        </div>
    );
}

const MyAccounts = () => { //should each card have a button to edit content?
    return (
        <div className="card-content">
            <div className="card-body">
                <li>Debit: $</li>
                <li>Credit: $</li>
                <li>Cash: $</li>
            </div>
        </div>
    );
}