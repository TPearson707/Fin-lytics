import React, { useState } from "react";
import "./card.scss";

const ProjectionsCard = () => {

    const [timeframe, setTimeframe] = useState("3m"); // default timeframe
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(null);
    const [savingsGoal, setSavingsGoal] = useState(0); // default savings goal
    const [frequency, setFrequency] = useState("weekly"); // default frequency
    const [isShowingResults, setIsShowingResults] = useState(false);

    const handleTimeframeChange = (e) => {
        const selectedTimeframe = e.target.value;
        setTimeframe(selectedTimeframe);

        const timeframesInMonths = {
            "3 months": 3,
            "6 months": 6,
            "9 months": 9,
            "1 year": 12,
            "1.5 years": 18,
        };

        const monthsToAdd = timeframesInMonths[selectedTimeframe] || 0;
        const newEndDate = new Date(startDate);
        newEndDate.setMonth(newEndDate.getMonth() + monthsToAdd);

        setEndDate(newEndDate);
    };

    const handleSavingsGoalChange = (e) => {
        setSavingsGoal(parseFloat(e.target.value) || 0);
    };

    const handleFrequencyChange = (e) => {
        setFrequency(e.target.value);
    };

    const calculateSavingsPerInterval = () => {
        const timeframesInMonths = {
            "3 months": 3,
            "6 months": 6,
            "9 months": 9,
            "1 year": 12,
            "1.5 years": 18,
        };

        const intervalsPerMonth = {
            weekly: 4,
            biweekly: 2,
            monthly: 1,
        };

        const months = timeframesInMonths[timeframe];
        const intervals = months * intervalsPerMonth[frequency];

        return savingsGoal / intervals || 0;
    };

    return (
        <div className="projections-card">
            <div className="card-header">
               
            </div>

            {!isShowingResults && (
                <div className="card-body">
                    <div className="selectors">
                        <div className="form-group">
                            <label className="time-sel" htmlFor="timeframe">Timeframe:</label>
                            <select id="timeframe" value={timeframe} onChange={handleTimeframeChange}>
                                <option value="3 months">3 Months</option>
                                <option value="6 months">6 Months</option>
                                <option value="9 months">9 Months</option>
                                <option value="1 year">1 Year</option>
                                <option value="1.5 years">1.5 Years</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="savings-goal">Savings Goal:</label>
                            <input
                                type="number"
                                id="savings-goal"
                                placeholder="Enter your goal"
                                value={savingsGoal}
                                onChange={handleSavingsGoalChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="frequency">Saving Frequency:</label>
                            <select id="frequency" value={frequency} onChange={handleFrequencyChange}>
                                <option value="weekly">Every Week</option>
                                <option value="biweekly">Every Other Week</option>
                                <option value="monthly">Once a Month</option>
                            </select>
                        </div>
                        <button className="calc-btn"
                            onClick={() => {
                                setIsShowingResults(true);
                            }}
                        >
                            Calculate
                        </button>
                    </div>
                </div>
            )}

            {isShowingResults && (
                <div className="results">
                    <ProjectedResults
                        savingsGoal={savingsGoal}
                        timeframe={timeframe}
                        frequency={frequency}
                        startDate={startDate}
                        endDate={endDate}
                        setIsShowingResults={setIsShowingResults}
                    />
                </div>
            )}
        </div>
    );
};

export default ProjectionsCard;

const ProjectedResults = ({ savingsGoal, timeframe, frequency, startDate, endDate, setIsShowingResults }) => {

    const calculateSavingsPerInterval = () => {
        const timeframesInMonths = {
            "3 months": 3,
            "6 months": 6,
            "9 months": 9,
            "1 year": 12,
            "1.5 years": 18,
        };
    
        const intervalsPerMonth = {
            weekly: 4,
            biweekly: 2,
            monthly: 1,
        };
    
        const months = timeframesInMonths[timeframe] || 0; 
        const intervals = months * (intervalsPerMonth[frequency] || 0); 
    
        // console.log("Timeframe:", timeframe, "Frequency:", frequency, "Savings Goal:", savingsGoal);
        // console.log("Months:", months, "Intervals:", intervals);
    
        return intervals > 0 ? savingsGoal / intervals : 0;
    };

    return (
        <div className="projected-results">
            <h4 className="results-title">Projected Savings</h4>
            <div className="results-contents">
                <p className="results-date">From <span className="highlight">{startDate.toLocaleDateString()}</span> to <span className="highlight">{endDate ? endDate.toLocaleDateString() : "N/A"}</span>:</p>
                <p className="results-goal">If you want to save <span className="highlight">${savingsGoal}</span>, then:</p> 
                <p className="results-interval">You need to save <span className="highlight">${calculateSavingsPerInterval().toFixed(2)}</span> <span className="highlight">{frequency}</span>.</p>
            </div>
            <div className="back-btn-wrapper"> 
                <button className="back-btn" onClick={() => setIsShowingResults(false)}>
                    Back
                </button>
            </div>
        </div>  
    );
};