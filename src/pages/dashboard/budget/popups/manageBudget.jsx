import React from "react";
import "../../../../components/popups/modal.scss";

const ManageBudgets = ({ onClose }) => {
    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    x
                </button>
                <h2>Manage Budget Projections</h2>
                <div className="annual-budget">
                    <h3>Set annual budget goals:</h3>
                    <form>
                        <label>
                            Budget Name:
                            <input type="text" placeholder="Enter budget name" />
                        </label>
                        <label>
                            Amount:
                            <input type="number" placeholder="Enter budget amount" />
                        </label>
                        <button type="submit">Save</button>
                    </form>
                </div>
                
                <div className="catergorical-budget">
                    <h3>Set categorical budget goals:</h3>
                    <form>
                        <label>
                            Category Name:
                            <input type="text" placeholder="Enter category name" />
                        </label>
                        <label>
                            Amount:
                            <input type="number" placeholder="Enter category amount" />
                        </label>
                        <button type="submit">Save</button>
                    </form>
                </div>
                
            </div>
        </div>
    );
};

export default ManageBudgets;