import React from 'react';
import { Paper, Box, Typography, Divider, List, ListItem, ListItemText } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

export default function MarketOverview({ market }) {
  if (!market || !market.gainers || market.gainers.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">No market data available.</Typography>
      </Paper>
    );
  }

  const indices = market.indices || [];
  // parse option contract symbols to show only the underlying ticker
  function parseTicker(symbol) {
    const match = symbol.match(/^([A-Z]{1,5})\d/);
    return match ? match[1] : symbol;
  }

  const gainers = (market.gainers || [])
    .slice(0, 10)
    .map(g => ({ ...g, displaySymbol: parseTicker(g.symbol) }))
    .filter(g => /^[A-Z]{1,5}$/.test(g.displaySymbol))
    .slice(0, 3);

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Market Overview</Typography>
      <Divider sx={{ mb: 2 }} />

      <Box sx={{ mb: 2 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ background: '#fff' }}>
              <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 700 }}>Index</th>
              <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 700 }}>Price</th>
              <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 700 }}>Change (%)</th>
            </tr>
          </thead>
          <tbody>
            {indices.map((i, idx) => {
              const isUp = i.change_percent >= 0;
              return (
                <tr key={idx} style={{ background: '#fff' }}>
                  <td style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600 }}>
                    <span title={i.index}>
                      {(i.index === 'Dow Jones Industrial Average' || i.ticker === 'Dow Jones Industrial Average') ? 'DJIA' : (i.ticker || i.index)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 8px' }}>{i.price.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600, color: isUp ? '#388e3c' : '#d32f2f' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      {isUp ? <ArrowUpwardIcon fontSize="small" sx={{ verticalAlign: 'middle', marginRight: '2px' }} /> : <ArrowDownwardIcon fontSize="small" sx={{ verticalAlign: 'middle', marginRight: '2px' }} />}
                      {isUp ? '+' : ''}{parseFloat(i.change_percent).toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>

      {/* Top Gainers */}
      {/* <Typography variant="subtitle1" color="primary" sx={{ mb: 1, fontWeight: 700, letterSpacing: 0.5 }}>Top Gainers</Typography> */}
      {/* <Box>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ background: 'rgba(245,248,255,0.7)' }}>
              <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 700 }}>Ticker</th>
              <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 700 }}>Price</th>
              <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 700 }}>Change (%)</th>
            </tr>
          </thead>
          <tbody>
            {gainers.map((g, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.95)' : 'inherit' }}>
                <td style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600 }}>
                  <span title={g.name || g.company || g.symbol}>{g.displaySymbol}</span>
                </td>
                <td style={{ textAlign: 'right', padding: '4px 8px' }}>${g.price.toFixed(2)}</td>
                <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600, color: '#388e3c' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <ArrowUpwardIcon fontSize="small" sx={{ verticalAlign: 'middle', marginRight: '2px' }} />
                    +{parseFloat(g.change_percent).toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box> */}
    </Paper>
  );
}
