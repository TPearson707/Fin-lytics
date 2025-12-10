import React from 'react';
import { Paper, Box, Typography, Divider } from '@mui/material';

export default function Summary({ summary, children }) {
  if (!summary) {
    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">No summary data available.</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Portfolio Value & Summary</Typography>

      <Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          ${summary.total_value.toLocaleString()}
        </Typography>

        <Typography variant="body1" color="success.main">
          Today: +${summary.daily_gain.toLocaleString()} (+{summary.daily_gain_percent}%)
        </Typography>

        <Typography variant="body1" color="success.dark">
          Total Gain: +${summary.total_gain.toLocaleString()} (+{summary.total_gain_percent}%)
        </Typography>
      </Box>

      {/* Render children below summary content, e.g. TopMovers */}
      {children && <Box sx={{ mt: 2 }}>{children}</Box>}

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" color="text.secondary">
        Last updated: {new Date().toLocaleString()}
      </Typography>
    </Paper>
  );
}
