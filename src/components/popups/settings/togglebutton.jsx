import { useState, useEffect } from "react";
import "./toggle.scss"

const ToggleButton = ({label}) => {
    return (
        <div className="button-container">
            <div className="toggle-switch">
                <input type="checkbox" className="checkbox" name={label} id={label}/>
                <label className="label" htmlFor={label}>
                    <span className="inner"/>
                    <span className="switch"/>
                </label>
            </div>
        </div>
    )
}

export default ToggleButton