import React, { useEffect, useState } from 'react';
import { Grid, CircularProgress, Typography, Box, Alert } from '@mui/material';
import Summary from './components/Summary';
import MarketMoversCarousel from './components/MarketMoversCarousel';
import Holdings from './components/Holdings';
import TopMovers from './components/TopMovers';
import MarketOverview from './components/MarketOverview';
import News from './components/News';
import axios from 'axios';

export default function Overview() {
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Removed portfolios and selectedPortfolio state

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:8000/overview', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOverviewData(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error: {error}
      </Alert>
    );

  return (
    <Box
      className="app-page"
      sx={{
        width: '100%',
        minHeight: '100vh',
        p: { xs: 1, sm: 2, md: 1 },
        boxSizing: 'border-box',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1200,
          background: '#fff',
          borderRadius: 2,
          boxShadow: 'none',
          p: { xs: 1, sm: 2 },
          mb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', mb: 3, width: '100%' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 1, color: '#2d3a4a' }}>Portfolio Overview</Typography>
        </Box>
        <Grid container spacing={2} sx={{ width: '100%', flexWrap: 'wrap' }}>
          <Grid item xs={12} md={10} sx={{ flexGrow: 1, minWidth: 0, width: { xs: '100%', md: '0' } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
              <Summary summary={overviewData.summary} />
              <Holdings />
            </Box>
          </Grid>
          <Grid item xs={12} md={2} sx={{ flexGrow: 1, minWidth: 0, width: { xs: '100%', md: '0' }, maxWidth: 320 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
              <TopMovers movers={overviewData.top_movers} />
              <MarketOverview market={overviewData.market_overview} />
              <MarketMoversCarousel gainers={overviewData.market_overview?.gainers || []} losers={overviewData.market_overview?.losers || []} compact />
            </Box>
          </Grid>
        </Grid>
        <Box sx={{ mt: 4 }}>
          <News news={overviewData.news_feed} />
        </Box>
      </Box>
    </Box>
  );
}
