import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, FormControl, InputLabel, Select, MenuItem, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export default function AddTransactionDialog({ open, onClose, defaultDate, onCreated }) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(defaultDate ? defaultDate : new Date().toISOString().slice(0,10));
  const [frequency, setFrequency] = useState('monthly');
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
    'recurring/subscription',
    'other'
  ];

  const isRecurring = category === 'recurring/subscription';

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        transaction_id: uuidv4(),
        account_id: 'manual',
        amount: parseFloat(amount),
        currency: 'USD',
        category: category,
        merchant_name: merchant,
        date: date,
        ...(isRecurring && { frequency: frequency })
      };
      const resp = await axios.post('http://localhost:8000/user_transactions/', payload, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setLoading(false);
      if (onCreated) onCreated(payload);
      onClose();
      
      // Reset form
      setMerchant('');
      setAmount('');
      setCategory('');
      setDate(new Date().toISOString().slice(0,10));
      setFrequency('monthly');
    } catch (e) {
      console.error('Error creating transaction', e);
      setLoading(false);
    }
  };

  return (
          <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ position: 'relative' }}>
          Add Transaction
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
          
          <TextField 
            label="Amount" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            fullWidth 
            type="number" 
            inputProps={{ step: '0.01', min: '0' }}
          />
          
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
          
          {isRecurring && (
            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                label="Frequency"
              >
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="biweekly">Bi-weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>
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
