import React, { useState } from "react";
import { Box, Button, MenuItem, Select, TextField, Typography } from "@mui/material";
import "../../../../styles/pages/dashboard/budget-page/card.scss";

const ProjectionsCard = () => {
  const [timeframe, setTimeframe] = useState("3 months");
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [frequency, setFrequency] = useState("weekly");
  const [isShowingResults, setIsShowingResults] = useState(false);
  const [error, setError] = useState("");

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

  const calculateSavingsPerInterval = () => {
    const months = timeframesInMonths[timeframe] || 0;
    const intervals = months * (intervalsPerMonth[frequency] || 0);

    return intervals > 0 ? (savingsGoal / intervals).toFixed(2) : "0.00";
  };

  const handleCalculate = () => {
    if (savingsGoal <= 0) {
      setError("Please enter a valid savings goal greater than 0.");
      return;
    }
    setError("");
    setIsShowingResults(true);
  };

  return (
    <Box sx={{ padding: 2, borderRadius: 2 }}>
      {!isShowingResults && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        
          <Box>
            <Typography variant="body1">Timeframe:</Typography>
            <Select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              fullWidth
              variant="outlined"
            >
              {Object.keys(timeframesInMonths).map((key) => (
                <MenuItem key={key} value={key}>
                  {key}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box>
            <Typography variant="body1">Savings Goal ($):</Typography>
            <TextField
              type="number"
              placeholder="Enter your goal"
              value={savingsGoal}
              onChange={(e) => setSavingsGoal(parseFloat(e.target.value) || 0)}
              fullWidth
              variant="outlined"
            />
          </Box>

          <Box>
            <Typography variant="body1">Saving Frequency:</Typography>
            <Select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              fullWidth
              variant="outlined"
            >
              {Object.keys(intervalsPerMonth).map((key) => (
                <MenuItem key={key} value={key}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {error && <Typography color="error">{error}</Typography>}

          <Button variant="contained" color="primary" onClick={handleCalculate}>
            Calculate
          </Button>
        </Box>
      )}

      {isShowingResults && (
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h6">Projected Savings</Typography>
          <Typography variant="body1">
            To save <strong>${savingsGoal}</strong> over <strong>{timeframe}</strong>, you need to save
            <strong> ${calculateSavingsPerInterval()}</strong> per <strong>{frequency}</strong>.
          </Typography>
          <Button variant="outlined" color="secondary" onClick={() => setIsShowingResults(false)}>
            Back
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ProjectionsCard;