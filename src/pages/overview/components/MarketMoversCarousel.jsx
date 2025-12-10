import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, IconButton } from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';

export default function MarketMoversCarousel({ gainers = [], losers = [], compact = false }) {
  const [active, setActive] = useState(0); // 0: gainers, 1: losers

  const movers = [
    { title: 'Top Gainers', data: gainers, color: 'success.main' },
    { title: 'Top Losers', data: losers, color: 'error.main' }
  ];

  return (
    <Card elevation={2} >
      <CardContent sx={{ p: compact ? 1 : 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1}}>
          <IconButton onClick={() => setActive((active + 1) % 2)} size="small" aria-label="previous">
            <ArrowBackIosIcon fontSize={compact ? 'small' : 'medium'} />
          </IconButton>
          <Typography variant={compact ? 'subtitle1' : 'h6'} color={movers[active].color} sx={{ fontWeight: 700 }}>
            {movers[active].title}
          </Typography>
          <IconButton onClick={() => setActive((active + 1) % 2)} size="small" aria-label="next">
            <ArrowForwardIosIcon fontSize={compact ? 'small' : 'medium'} />
          </IconButton>
        </Box>
        <Box sx={{ width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.97rem', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '23%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '24%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#fff' }}>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 700, fontSize: '1rem', letterSpacing: 0.5 }}>Ticker</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 700, fontSize: '1rem', letterSpacing: 0.5 }}>Price</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 700, fontSize: '1rem', letterSpacing: 0.5 }}>Chg</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 700, fontSize: '1rem', letterSpacing: 0.5 }}>%</th>
              </tr>
            </thead>
            <tbody>
              {movers[active].data.map((m, idx) => (
                <tr key={idx} style={{ background: '#fff' }}>
                  <td style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 600, letterSpacing: 1 }}>
                    <span title={m.name || m.symbol}>{m.symbol}</span>
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 10px', fontVariantNumeric: 'tabular-nums' }}>${m.price?.toFixed(2) ?? '-'}</td>
                  <td style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 600, color: m.change > 0 ? '#388e3c' : '#d32f2f', fontVariantNumeric: 'tabular-nums' }}>
                    {m.change > 0 ? '+' : ''}{m.change?.toFixed(2) ?? '-'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 600, color: m.change_percent > 0 ? '#388e3c' : '#d32f2f', fontVariantNumeric: 'tabular-nums' }}>
                    {m.change_percent > 0 ? '+' : ''}{m.change_percent?.toFixed(2) ?? '-'}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </CardContent>
    </Card>
  );
}
