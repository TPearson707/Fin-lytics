import { useState, useEffect } from "react";
import "../../../../styles/components/toggle.scss"

const ToggleButton = ({label, checked, onChange}) => {
    const handleToggle = (e) => {
        onChange(e.target.checked);
    };

    return (
        <div className="button-container">
            <div className="toggle-switch">
                <input
                    type="checkbox"
                    className="checkbox"
                    name={label}
                    id={label}
                    checked={checked} // bind the checked state
                    onChange={handleToggle} // handle toggle changes
                />
                <label className="label" htmlFor={label}>
                    <span className="inner" />
                    <span className="switch" />
                </label>
            </div>
        </div>
    )
}

export default ToggleButton