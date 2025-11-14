import React, { useEffect, useState } from "react";
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';

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

const STORAGE_KEY = "projectionsDraft_v2";

const ProjectionsCard = () => {
    const [tabIndex, setTabIndex] = useState(0);
    const [timeframe, setTimeframe] = useState("3 months");
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(null);
    const [savingsGoal, setSavingsGoal] = useState(0);
    const [frequency, setFrequency] = useState("weekly");
    const [isShowingResults, setIsShowingResults] = useState(false);
    const [monthlyExpenses, setMonthlyExpenses] = useState([]);
        // expenseMode: 'monthly' (applies each month) or 'perInterval' (applies to specific interval/month)
        const [expenseMode, setExpenseMode] = useState('monthly');
        const [perIntervalExpenses, setPerIntervalExpenses] = useState([]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed) {
                    setTimeframe(parsed.timeframe || "3 months");
                    setStartDate(parsed.startDate ? new Date(parsed.startDate) : new Date());
                    setEndDate(parsed.endDate ? new Date(parsed.endDate) : null);
                    setSavingsGoal(parsed.savingsGoal || 0);
                    setFrequency(parsed.frequency || "weekly");
                        setMonthlyExpenses(parsed.monthlyExpenses || []);
                        setExpenseMode(parsed.expenseMode || 'monthly');
                        setPerIntervalExpenses(parsed.perIntervalExpenses || []);
                }
            }
        } catch (e) {
            // ignore
        }
    }, []);

    useEffect(() => {
        const draft = {
            timeframe,
            startDate: startDate ? startDate.toISOString() : null,
            endDate: endDate ? endDate.toISOString() : null,
            savingsGoal,
            frequency,
                monthlyExpenses,
                expenseMode,
                perIntervalExpenses,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }, [timeframe, startDate, endDate, savingsGoal, frequency, monthlyExpenses]);

    const handleTimeframeChange = (e) => {
        const selected = e.target.value;
        setTimeframe(selected);
        if (selected !== "custom") {
            const monthsToAdd = timeframesInMonths[selected] || 0;
            const newEnd = new Date(startDate);
            newEnd.setMonth(newEnd.getMonth() + monthsToAdd);
            setEndDate(newEnd);
        }
    };

    const handleSavingsGoalChange = (e) => setSavingsGoal(parseFloat(e.target.value) || 0);
    const handleFrequencyChange = (e) => setFrequency(e.target.value);

    const addMonthlyExpense = () => setMonthlyExpenses((s) => [...s, { id: Date.now(), desc: "", amount: 0 }]);
    const updateExpense = (id, field, value) =>
        setMonthlyExpenses((list) => list.map((it) => (it.id === id ? { ...it, [field]: field === "amount" ? parseFloat(value) || 0 : value } : it)));
    const removeExpense = (id) => setMonthlyExpenses((list) => list.filter((it) => it.id !== id));

        // per-interval expenses handlers
        const addPerIntervalExpense = () => {
            setPerIntervalExpenses((s) => [...s, { id: Date.now(), desc: '', intervalIndex: 1, amount: 0 }]);
        };
        const updatePerIntervalExpense = (id, field, value) =>
            setPerIntervalExpenses((list) => list.map((it) => (it.id === id ? { ...it, [field]: field === 'amount' || field === 'intervalIndex' ? parseFloat(value) || 0 : value } : it)));
        const removePerIntervalExpense = (id) => setPerIntervalExpenses((list) => list.filter((it) => it.id !== id));

    const calculateMonthsBetween = (start, end) => {
        if (!start || !end) return 0;
        const s = new Date(start.getFullYear(), start.getMonth(), 1);
        const e = new Date(end.getFullYear(), end.getMonth(), 1);
        const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
        return Math.max(0, months);
    };

    const computeTotals = () => {
        const months = timeframesInMonths[timeframe] || 0;

            const totalMonthlyExp = monthlyExpenses.reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);
            const intervals = Math.max(months * (intervalsPerMonth[frequency] || 0), 0);
            // sum per-interval expenses that fall within the interval range
            const totalPerIntervalExpenses = perIntervalExpenses.reduce((acc, cur) => {
                const intervalIndex = parseInt(cur.intervalIndex) || 0;
                const isWithinRange = intervalIndex >= 1 && intervalIndex <= intervals;
                if (isWithinRange) return acc + (parseFloat(cur.amount) || 0);
                return acc;
            }, 0);

            const totalExpensesOverPeriod = totalMonthlyExp * months + totalPerIntervalExpenses;
        const netToSave = savingsGoal - totalExpensesOverPeriod;
        const perInterval = intervals > 0 ? netToSave / intervals : 0;

        return { months, totalMonthlyExp, totalExpensesOverPeriod, intervals, netToSave, perInterval };
    };

        const onCalculate = () => {
            const monthsToAdd = timeframesInMonths[timeframe] || 0;
            const newEnd = new Date(startDate);
            newEnd.setMonth(newEnd.getMonth() + monthsToAdd);
            setEndDate(newEnd);
        setIsShowingResults(true);
    };

    const handleTabChange = (e, newIndex) => {
        setTabIndex(newIndex);
        setIsShowingResults(false);
    };
    // preview helper: compute months/intervals without toggling results
    const preview = () => computeTotals();

    const validatePerInterval = () => {
        const months = timeframesInMonths[timeframe] || 0;
        const intervals = Math.max(months * (intervalsPerMonth[frequency] || 0), 0);
        const invalid = perIntervalExpenses.filter((it) => {
            const intervalIndex = parseInt(it.intervalIndex) || 0;
            return intervalIndex < 1 || intervalIndex > intervals;
        });
        return invalid;
    };

    return (
        <Box className="projections-card" sx={{ 
            padding: 2, 
            overflow: 'hidden'
        }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Budget Projections</Typography>
            <Box className="card-header" sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="projections tabs">
                    <Tab label="Basic" />
                    <Tab label="Advanced" />
                </Tabs>
            </Box>

            {tabIndex === 0 && (
                <Box>
                    {!isShowingResults && (
                        <Box sx={{ maxHeight: 520, overflow: 'auto', pr: 1 }}>
                            <Stack spacing={1.5} className="card-body" sx={{ }}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
                                    <FormControl sx={{ minWidth: 160}}>
                                        <InputLabel id="timeframe-label">Timeframe</InputLabel>
                                        <Select labelId="timeframe-label" id="timeframe" value={timeframe} label="Timeframe" onChange={handleTimeframeChange}>
                                            <MenuItem value="3 months">3 Months</MenuItem>
                                            <MenuItem value="6 months">6 Months</MenuItem>
                                            <MenuItem value="9 months">9 Months</MenuItem>
                                            <MenuItem value="1 year">1 Year</MenuItem>
                                            <MenuItem value="1.5 years">1.5 Years</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <TextField label="Savings Goal" type="number" value={savingsGoal} onChange={handleSavingsGoalChange} />

                                    <FormControl sx={{ minWidth: 160 }}>
                                        <InputLabel id="frequency-label">Frequency</InputLabel>
                                        <Select labelId="frequency-label" id="frequency" value={frequency} label="Frequency" onChange={handleFrequencyChange}>
                                            <MenuItem value="weekly">Every Week</MenuItem>
                                            <MenuItem value="biweekly">Every Other Week</MenuItem>
                                            <MenuItem value="monthly">Once a Month</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Stack>

                                <Box>
                                    <Typography variant="caption" color="text.secondary">Preview: {preview().months} months — {preview().intervals} intervals ({intervalsPerMonth[frequency]} per month)</Typography>
                                    <Box sx={{ mt: 1 }}>
                                        <Button variant="contained" onClick={onCalculate}>Calculate</Button>
                                    </Box>
                                </Box>
                            </Stack>
                        </Box>
                    )}

                    {isShowingResults && (
                        <Box sx={{ mt: 2 }}>
                            <ProjectedResults
                                savingsGoal={savingsGoal}
                                timeframe={timeframe}
                                frequency={frequency}
                                startDate={startDate}
                                endDate={endDate}
                                monthlyExpenses={monthlyExpenses}
                                computeTotals={computeTotals}
                                setIsShowingResults={setIsShowingResults}
                            />
                        </Box>
                    )}
                </Box>
            )}

            {/* advanced tab */}
            {tabIndex === 1 && (
                <Box>
                    {!isShowingResults && (
                        <Box sx={{ maxHeight: 520, overflow: 'auto', pr: 1 }}>
                            <Stack spacing={1.5} className="card-body">
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
                                    <FormControl sx={{ minWidth: 160 }}>
                                        <InputLabel id="timeframe-label">Timeframe</InputLabel>
                                        <Select labelId="timeframe-label" id="timeframe" value={timeframe} label="Timeframe" onChange={handleTimeframeChange}>
                                            <MenuItem value="3 months">3 Months</MenuItem>
                                            <MenuItem value="6 months">6 Months</MenuItem>
                                            <MenuItem value="9 months">9 Months</MenuItem>
                                            <MenuItem value="1 year">1 Year</MenuItem>
                                            <MenuItem value="1.5 years">1.5 Years</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {timeframe === "custom" && (
                                        <Grid container spacing={1} alignItems="center">
                                            <Grid item>
                                                <TextField
                                                    label="Start Date"
                                                    type="date"
                                                    value={startDate ? startDate.toISOString().slice(0, 10) : ""}
                                                    onChange={(e) => setStartDate(new Date(e.target.value))}
                                                    InputLabelProps={{ shrink: true }}
                                                    sx={{ width: 160 }}
                                                />
                                            </Grid>
                                            <Grid item>
                                                <TextField
                                                    label="End Date"
                                                    type="date"
                                                    value={endDate ? endDate.toISOString().slice(0, 10) : ""}
                                                    onChange={(e) => setEndDate(new Date(e.target.value))}
                                                    InputLabelProps={{ shrink: true }}
                                                    sx={{ width: 160 }}
                                                />
                                            </Grid>
                                        </Grid>
                                    )}

                                    <TextField label="Savings Goal" type="number" value={savingsGoal} onChange={handleSavingsGoalChange} />

                                    <FormControl sx={{ minWidth: 160 }}>
                                        <InputLabel id="frequency-label">Frequency</InputLabel>
                                        <Select labelId="frequency-label" id="frequency" value={frequency} label="Frequency" onChange={handleFrequencyChange}>
                                            <MenuItem value="weekly">Every Week</MenuItem>
                                            <MenuItem value="biweekly">Every Other Week</MenuItem>
                                            <MenuItem value="monthly">Once a Month</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Stack>

                                <Divider />

                                <Box>
                                    <Box sx={{ mb: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Preview: {preview().months} months — {preview().intervals} intervals ({intervalsPerMonth[frequency]} per month). Choose "Date-Specific" to assign expenses to particular dates within your timeframe.</Typography>
                                    </Box>

                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
                                        <Typography variant="subtitle1">Expense Mode</Typography>
                                        <FormControl sx={{ minWidth: 180 }}>
                                            <InputLabel id="expense-mode-label">Mode</InputLabel>
                                            <Select labelId="expense-mode-label" value={expenseMode} label="Mode" onChange={(e) => setExpenseMode(e.target.value)}>
                                                <MenuItem value={'monthly'}>Recurring Monthly (applies each month)</MenuItem>
                                                <MenuItem value={'perInterval'}>Per-Interval (assign to specific interval)</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Stack>

                                    {expenseMode === 'monthly' && (
                                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                            <Typography sx={{ mt: 0.5, fontSize: '0.9rem' }}>Monthly Expenses</Typography>
                                            {monthlyExpenses.map((exp) => (
                                                <Stack key={exp.id} direction="row" spacing={0.5} alignItems="center">
                                                    <TextField placeholder="Description" value={exp.desc} onChange={(e) => updateExpense(exp.id, 'desc', e.target.value)} sx={{ flex: 1 }} size="small" />
                                                    <TextField label="Amount ($)" type="number" value={exp.amount} onChange={(e) => updateExpense(exp.id, 'amount', e.target.value)} sx={{ width: 140 }} size="small" />
                                                    <IconButton color="error" onClick={() => removeExpense(exp.id)}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Stack>
                                            ))}

                                            <Button startIcon={<AddIcon />} onClick={addMonthlyExpense} variant="outlined">Add Monthly Expense</Button>
                                        </Stack>
                                    )}

                                    {expenseMode === 'perInterval' && (
                                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                            <Typography sx={{ mt: 0.5, fontSize: '0.9rem' }}>Per-Interval Expenses</Typography>
                                            {perIntervalExpenses.map((exp) => {
                                                const months = timeframesInMonths[timeframe] || 0;
                                                const intervals = Math.max(months * (intervalsPerMonth[frequency] || 0), 0);
                                                const intervalIndex = parseInt(exp.intervalIndex) || 0;
                                                const invalid = intervalIndex < 1 || intervalIndex > intervals;
                                                return (
                                                    <Stack key={exp.id} direction="row" spacing={0.5} alignItems="center">
                                                        <TextField placeholder="Description" value={exp.desc} onChange={(e) => updatePerIntervalExpense(exp.id, 'desc', e.target.value)} sx={{ flex: 1 }} size="small" />
                                                        <TextField 
                                                            label="Interval #" 
                                                            type="number" 
                                                            value={exp.intervalIndex} 
                                                            onChange={(e) => updatePerIntervalExpense(exp.id, 'intervalIndex', e.target.value)} 
                                                            sx={{ width: 100 }} 
                                                            size="small"
                                                            inputProps={{
                                                                min: 1,
                                                                max: intervals
                                                            }}
                                                            error={invalid}
                                                            helperText={invalid ? `Must be 1-${intervals}` : ''}
                                                        />
                                                        <TextField label="Amount ($)" type="number" value={exp.amount} onChange={(e) => updatePerIntervalExpense(exp.id, 'amount', e.target.value)} sx={{ width: 120 }} size="small" />
                                                        <IconButton color="error" onClick={() => removePerIntervalExpense(exp.id)}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                        {invalid && <Typography color="error" variant="caption" sx={{ ml: 1 }}>Date out of range</Typography>}
                                                    </Stack>
                                                );
                                            })}

                                            <Button startIcon={<AddIcon />} onClick={addPerIntervalExpense} variant="outlined">Add Per-Interval Expense</Button>
                                            <Typography variant="caption">
                                                Tip: Add expenses that occur in specific intervals. Interval 1 = first {frequency === 'weekly' ? 'week' : frequency === 'biweekly' ? 'two weeks' : 'month'}, etc.
                                            </Typography>
                                            {validatePerInterval().length > 0 && <Alert severity="warning">Some expenses have interval numbers outside the range. Please adjust the interval numbers.</Alert>}
                                        </Stack>
                                    )}

                                </Box>

                                <Box>
                                    <Button variant="contained" onClick={onCalculate}>Calculate</Button>
                                </Box>
                            </Stack>
                        </Box>
                    )}

                    {isShowingResults && (
                        <Box sx={{ mt: 2 }}>
                            <ProjectedResults
                                savingsGoal={savingsGoal}
                                timeframe={timeframe}
                                frequency={frequency}
                                startDate={startDate}
                                endDate={endDate}
                                monthlyExpenses={monthlyExpenses}
                                computeTotals={computeTotals}
                                setIsShowingResults={setIsShowingResults}
                            />
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default ProjectionsCard;

const ProjectedResults = ({ savingsGoal, timeframe, frequency, startDate, endDate, monthlyExpenses, computeTotals, setIsShowingResults }) => {
    const { months, totalMonthlyExp, totalExpensesOverPeriod, intervals, netToSave, perInterval } = computeTotals();

    return (
        <Paper sx={{ p: 1.5 }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>Projected Savings</Typography>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                <Typography sx={{ fontSize: '0.9rem' }}>
                    From <strong>{startDate.toLocaleDateString()}</strong> to <strong>{endDate ? endDate.toLocaleDateString() : 'N/A'}</strong> ({months} months)
                </Typography>

                <Typography sx={{ fontSize: '0.9rem' }}>Goal: <strong>${savingsGoal.toFixed(2)}</strong></Typography>
                <Typography sx={{ fontSize: '0.9rem' }}>Monthly expenses total: <strong>${totalMonthlyExp.toFixed(2)}</strong></Typography>
                <Typography sx={{ fontSize: '0.9rem' }}>Total expenses over period: <strong>${totalExpensesOverPeriod.toFixed(2)}</strong></Typography>
                <Typography sx={{ fontSize: '0.9rem' }}>Net to save (goal - expenses): <strong>${netToSave.toFixed(2)}</strong></Typography>
                <Typography sx={{ fontSize: '0.9rem' }}>Saving frequency: <strong>{frequency}</strong> — intervals: <strong>{intervals}</strong></Typography>
                <Typography sx={{ fontSize: '0.9rem' }}>You need to save <strong>${perInterval.toFixed(2)}</strong> per <strong>{frequency}</strong> to meet the net target.</Typography>

                {netToSave < 0 && (
                    <Typography color="error">Warning: projected expenses exceed goal by <strong>${Math.abs(netToSave).toFixed(2)}</strong>.</Typography>
                )}

                <Divider />

                <Typography variant="subtitle2">Expenses list</Typography>
                {monthlyExpenses.length === 0 && <Typography>No monthly expenses added.</Typography>}
                {monthlyExpenses.map((e) => (
                    <Stack direction="row" justifyContent="space-between" key={e.id}>
                        <Typography>{e.desc || 'Untitled'}</Typography>
                        <Typography>${(parseFloat(e.amount) || 0).toFixed(2)} / month</Typography>
                    </Stack>
                ))}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Button onClick={() => setIsShowingResults(false)} variant="outlined">Back</Button>
                </Box>
            </Stack>
        </Paper>
    );
};