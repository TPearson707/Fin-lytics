
import React from 'react';
import { Paper, Typography, Divider } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

export default function TopMovers({ movers, small }) {
  if (!movers || movers.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: small ? 1 : 2, minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">No movers available.</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: small ? 1 : 2, minWidth: 0, width: small ? 180 : undefined, boxShadow: small ? 0 : undefined }}>
      <Typography variant={small ? 'subtitle2' : 'h6'} gutterBottom sx={{ fontWeight: small ? 700 : undefined, fontSize: small ? 14 : undefined }}>
        Top Movers
      </Typography>
      <Divider sx={{ mb: small ? 0.5 : 1 }} />
      <div style={{ width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: small ? '0.93rem' : '1rem', tableLayout: 'auto' }}>
          <thead>
            <tr style={{ background: '#fff' }}>
              <th style={{ textAlign: 'left', padding: '4px 5px', fontWeight: 700 }}>Ticker</th>
              <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 700 }}>Price</th>
              <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 700 }}>Change</th>
            </tr>
          </thead>
          <tbody>
            {movers.map((m, idx) => {
              const isUp = m.change_value >= 0;
              return (
                <tr key={idx} style={{ background: '#fff' }}>
                  <td style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 700 }} title={m.name}>{m.symbol}</td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', fontVariantNumeric: 'tabular-nums', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>${m.price?.toFixed(2) ?? '-'}</td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600, color: isUp ? '#388e3c' : '#d32f2f', fontVariantNumeric: 'tabular-nums', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isUp ? '+' : ''}{m.change_value?.toFixed(2) ?? '-'}
                    <span style={{ marginLeft: 4, fontSize: '0.97em', color: isUp ? '#388e3c' : '#d32f2f' }}>
                      ({isUp ? '+' : ''}{m.change_percent?.toFixed(2) ?? '-'}%)
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Paper>
  );
}
