import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export default function AddTransactionDialog({ open, onClose, defaultDate, onCreated }) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(defaultDate ? defaultDate : new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);

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
        date: date
      };
      const resp = await axios.post('http://localhost:8000/user_transactions/', payload, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setLoading(false);
      if (onCreated) onCreated(payload);
      onClose();
    } catch (e) {
      console.error('Error creating transaction', e);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Transaction</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} fullWidth />
          <TextField label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} fullWidth type="number" />
          <TextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} fullWidth />
          <TextField label="Date" value={date} onChange={(e) => setDate(e.target.value)} fullWidth type="date" InputLabelProps={{ shrink: true }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={loading} onClick={handleSubmit}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}
