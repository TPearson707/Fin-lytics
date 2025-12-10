import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Paper,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material';

export default function Holdings({ portfolioId = null }) {
    function parseTicker(symbol) {
      const match = symbol && symbol.match(/^([A-Z]{1,5})\d/);
      return match ? match[1] : symbol;
    }
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const token = localStorage.getItem('token');
        const url = portfolioId ? `http://localhost:8000/investments/holdings?portfolio_id=${encodeURIComponent(portfolioId)}` : 'http://localhost:8000/investments/holdings';
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHoldings(res.data.holdings || []);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch holdings');
      } finally {
        setLoading(false);
      }
    };
    fetchHoldings();
  }, [portfolioId]);

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );

  if (!holdings.length)
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No holdings available yet.
      </Alert>
    );

  return (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Portfolio Holdings
      </Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Ticker</strong></TableCell>
              <TableCell align="right"><strong>Shares</strong></TableCell>
              <TableCell align="right"><strong>Price</strong></TableCell>
              <TableCell align="right"><strong>Market Value</strong></TableCell>
              <TableCell align="right"><strong>Daily Change ($)</strong></TableCell>
              <TableCell align="right"><strong>Daily Change (%)</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {holdings.map((h, idx) => (
              <TableRow key={idx} sx={{ backgroundColor: idx % 2 === 0 ? 'rgba(245,248,255,0.7)' : 'inherit' }}>
                <TableCell sx={{ fontWeight: 700 }}>
                  <span title={h.name || h.company || h.symbol}>{parseTicker(h.symbol) || '-'}</span>
                </TableCell>
                <TableCell align="right">{h.quantity?.toLocaleString() || 0}</TableCell>
                <TableCell align="right">${(h.price || 0).toFixed(2)}</TableCell>
                <TableCell align="right">${(h.value || 0).toLocaleString()}</TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color:
                      h.daily_change > 0
                        ? 'success.main'
                        : h.daily_change < 0
                        ? 'error.main'
                        : 'text.primary',
                    fontWeight: 600,
                  }}
                >
                  {h.daily_change >= 0 ? '+' : ''}${h.daily_change?.toFixed(2) || '0.00'}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color:
                      h.daily_change_percent > 0
                        ? 'success.main'
                        : h.daily_change_percent < 0
                        ? 'error.main'
                        : 'text.primary',
                    fontWeight: 600,
                  }}
                >
                  {h.daily_change_percent >= 0 ? '+' : ''}{h.daily_change_percent?.toFixed(2) || '0.00'}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
