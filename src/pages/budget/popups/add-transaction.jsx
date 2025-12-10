import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, FormControl, InputLabel, Select, MenuItem, IconButton, FormControlLabel, Checkbox, Typography, Chip, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
export default function AddTransactionDialog({ open, onClose, defaultDate, onCreated, initialData = null, isEdit = false, onSubmit = null }) {
  // Category color state and fetch logic (copied from WeeklyOverview.jsx)
  const [categoryColors, setCategoryColors] = useState({});
  const [colorLoading, setColorLoading] = useState(false);

  const fetchCategoryColors = async () => {
    try {
      setColorLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id;
      const response = await axios.get(`http://localhost:8000/user_categories/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      const colorMap = {};
      response.data.forEach(category => {
        if (category.name) {
          colorMap[category.name.trim().toLowerCase()] = category.color;
        }
      });
      setCategoryColors(colorMap);
    } catch (error) {
      console.error('Error fetching category colors:', error);
    } finally {
      setColorLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    if (!category) return '#9E9E9E';
    const norm = category.trim().toLowerCase();
    let color = categoryColors[norm];
    if (!color) {
      const matchingKey = Object.keys(categoryColors).find(key => key === norm);
      if (matchingKey) color = categoryColors[matchingKey];
    }
    return color || '#9E9E9E';
  };

  useEffect(() => {
    fetchCategoryColors();
  }, []);
  const [merchant, setMerchant] = useState('');
  const [transactionId, setTransactionId] = useState(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  
  const [date, setDate] = useState(defaultDate ? defaultDate : new Date().toISOString().slice(0,10));
  const [isRecurring, setIsRecurring] = useState(false);
  const [isIncome, setIsIncome] = useState(false);
  const [frequencyType, setFrequencyType] = useState('monthly'); // 'weekly', 'monthly', 'yearly'
  const [weekDay, setWeekDay] = useState('monday'); //  weekly recurring
  const [monthDay, setMonthDay] = useState(1); //  monthly recurring (1-31)
  const [yearMonth, setYearMonth] = useState(1); //  yearly recurring (1-12)
  const [yearDay, setYearDay] = useState(1); //  yearly recurring (1-31)
  const [endDate, setEndDate] = useState(''); // OPTIONAL end date
  const [loading, setLoading] = useState(false);

  const categories = [
    'food',
    'transportation', 
    'utilities',
    'entertainment',
    'shopping',
    'healthcare',
    'education',
    'travel',
    'other'
  ];

  const weekDays = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // calculate end date if not provided (default to 1 year from start date)
      const calculatedEndDate = endDate || new Date(new Date(date).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0,10);
      
      let amt = parseFloat(amount);
      if (isNaN(amt)) amt = 0;
      if (!isIncome && amt > 0) amt = -amt;

      const payload = {
        transaction_id: transactionId || uuidv4(),
        account_id: 'manual',
        amount: amt,
        currency: 'USD',
        category: category,
        merchant_name: merchant,
        date: date,
        is_recurring: isRecurring,
        ...(isRecurring && {
          frequency_type: frequencyType,
          ...(frequencyType === 'weekly' && { week_day: weekDay }),
          ...(frequencyType === 'monthly' && { month_day: monthDay }),
          ...(frequencyType === 'yearly' && { 
            year_month: yearMonth,
            year_day: yearDay 
          }),
          end_date: calculatedEndDate
        })
      };
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const resp = await axios.post('http://localhost:8000/user_transactions/', payload, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        if (onCreated) onCreated(payload);
      }
      setLoading(false);
      onClose();
      
      setMerchant('');
      setTransactionId(null);
      setAmount('');
      setCategory('');
      
      setDate(new Date().toISOString().slice(0,10));
      setIsRecurring(false);
      setIsIncome(false);
      setFrequencyType('monthly');
      setWeekDay('monday');
      setMonthDay(1);
      setYearMonth(1);
      setYearDay(1);
      setEndDate('');
    } catch (e) {
      console.error('Error creating transaction', e);
      setLoading(false);
    }
  };

  // populate form when editing
  useEffect(() => {
    if (initialData) {
      const normalizeForInput = (d) => {
        if (!d) return (defaultDate ? defaultDate : new Date().toISOString().slice(0,10));
        // if already a YYYY-MM-DD string, use as-is
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        const dt = new Date(d);
        // use local date components to avoid timezone shifts
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      setTransactionId(initialData.transaction_id || null);
      setMerchant(initialData.merchant_name || '');
      setAmount(initialData.amount !== undefined ? Math.abs(initialData.amount).toString() : '');
      setCategory(initialData.category || '');
      
      setDate(normalizeForInput(initialData.date));
      setIsRecurring(!!initialData.is_recurring);
      setIsIncome((initialData.amount || 0) > 0);
    } else if (!open) {
      // reset when dialog closed
      setTransactionId(null);
      setMerchant('');
      setAmount('');
      setCategory('');
      setDate(defaultDate ? defaultDate : new Date().toISOString().slice(0,10));
      setIsRecurring(false);
      setIsIncome(false);
    }
  }, [initialData, open]);

  return (
          <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={isEdit ? { sx: { mt: 6 } } : {}}
          >
        <DialogTitle sx={{ position: 'relative' }}>
          {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField 
            label="Merchant/Description" 
            value={merchant} 
            onChange={(e) => setMerchant(e.target.value)} 
            placeholder={isRecurring ? "e.g., Netflix, Rent, Phone Bill" : "e.g., Walmart, Gas Station"}
            fullWidth 
          />
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField 
              label="Amount" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              sx={{ flex: 1 }}
              type="number" 
              inputProps={{ step: '0.01' }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={isIncome}
                  onChange={(e) => setIsIncome(e.target.checked)}
                  sx={{ '&.Mui-checked': { color: '#388e3c' } }}
                />
              }
              label="Income"
              sx={{ minWidth: 100 }}
            />
          </Box>

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              label="Category"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
         

          <TextField 
            label={isRecurring ? "Start Date" : "Date"} 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            fullWidth 
            type="date" 
            InputLabelProps={{ shrink: true }} 
          />
          
          <FormControlLabel
            control={
              <Checkbox 
                checked={isRecurring} 
                onChange={(e) => setIsRecurring(e.target.checked)}
                sx={{
                  '&.Mui-checked': {
                    color: '#2563eb',
                  },
                }}
              />
            }
            label="This is a recurring transaction"
            sx={{ mt: 1 }}
          />
          
          {isRecurring && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, p: 2, backgroundColor: '#f8fafc', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600 }}>
                Recurring Transaction Settings
              </Typography>
              
              <FormControl fullWidth>
                <InputLabel>Frequency Type</InputLabel>
                <Select
                  value={frequencyType}
                  onChange={(e) => setFrequencyType(e.target.value)}
                  label="Frequency Type"
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
              
              {frequencyType === 'weekly' && (
                <FormControl fullWidth>
                  <InputLabel>Day of Week</InputLabel>
                  <Select
                    value={weekDay}
                    onChange={(e) => setWeekDay(e.target.value)}
                    label="Day of Week"
                  >
                    {weekDays.map((day) => (
                      <MenuItem key={day.value} value={day.value}>
                        {day.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              {frequencyType === 'monthly' && (
                <TextField
                  label="Day of Month"
                  type="number"
                  value={monthDay}
                  onChange={(e) => setMonthDay(parseInt(e.target.value))}
                  inputProps={{ min: 1, max: 31 }}
                  fullWidth
                  helperText="Day of the month (1-31)"
                />
              )}
              
              {frequencyType === 'yearly' && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={yearMonth}
                      onChange={(e) => setYearMonth(e.target.value)}
                      label="Month"
                    >
                      {months.map((month) => (
                        <MenuItem key={month.value} value={month.value}>
                          {month.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Day"
                    type="number"
                    value={yearDay}
                    onChange={(e) => setYearDay(parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 31 }}
                    fullWidth
                  />
                </Box>
              )}
              
              <TextField 
                label="End Date (Optional)" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                fullWidth 
                type="date" 
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty to automatically end after 1 year"
              />
            </Box>
          )}
          
          
        </Box>
      </DialogContent>
              <DialogActions>
          <Button 
            onClick={onClose}
            sx={{ 
              color: '#666',
              '&:hover': {
                backgroundColor: 'rgba(102, 102, 102, 0.1)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            sx={{
              backgroundColor: '#2563eb',
              color: 'white',
              '&:hover': {
                backgroundColor: '#1d4ed8'
              }
            }}
          >
            Add
          </Button>
        </DialogActions>
    </Dialog>
  );
}
