import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Box, Grid, Paper, Typography, IconButton, Button, List, ListItem, ListItemText, Divider, Drawer, ToggleButton, ToggleButtonGroup, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Chip } from '@mui/material';
import AddTransactionDialog from './popups/add-transaction';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const formatISO = (d) => d.toISOString().slice(0,10);

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun & 6=Sat
  const diff = day; // sunday as start of week rather than monday
  d.setDate(d.getDate() - diff);
  d.setHours(0,0,0,0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0,0,0,0);
  return d;
}

function endOfMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23,59,59,999);
  return d;
}

export default function FinancialCalendar() {
  const [mode, setMode] = useState('week'); // or 'month'
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [monthBase, setMonthBase] = useState(() => startOfMonth(new Date()));
  const [eventsByDate, setEventsByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [openDay, setOpenDay] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [upcoming, setUpcoming] = useState([]);
  const [cache, setCache] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');

  // fetch for a given range
  const fetchRange = async (start, end) => {
    const key = `${formatISO(start)}_${formatISO(end)}`;
    if (cache[key]) {
      setEventsByDate(cache[key]);
      // still trigger a background refresh
    } else {
      setLoading(true);
    }
    try {
      const token = localStorage.getItem('token');
      const resp = await axios.get(`http://localhost:8000/user_transactions/?start_date=${formatISO(start)}&end_date=${formatISO(end)}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      const all = [ 
        ...(resp.data.db_transactions || []), 
        ...(resp.data.plaid_transactions || []),
        ...(resp.data.user_transactions || []),
        ...(resp.data.recurring_transactions || [])
      ];
      const grouped = {};
      all.forEach(tx => {
        const d = tx.date;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(tx);
      });
      Object.keys(grouped).forEach(k => grouped[k].sort((a,b) => new Date(b.date) - new Date(a.date)));
      // store in cache and set state
      setCache(prev => ({ ...prev, [key]: grouped }));
      setEventsByDate(grouped);
    } catch (e) {
      console.error('WeeklyOverview fetch error', e);
      setEventsByDate({});
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrentRange = () => {
    if (mode === 'week') {
      fetchRange(weekStart, addDays(weekStart,6));
    } else {
      fetchRange(startOfMonth(monthBase), endOfMonth(monthBase));
    }
  };

  // current week fetch
  useEffect(() => {
    if (mode !== 'week') return;
    const start = weekStart;
    const end = addDays(weekStart, 6);
    fetchRange(start, end);
  }, [weekStart, mode]);

  // current month fetch
  useEffect(() => {
    if (mode !== 'month') return;
    const start = startOfMonth(monthBase);
    const end = endOfMonth(monthBase);
    fetchRange(start, end);
  }, [monthBase, mode]);

  // upcoming (next 30 days) for small "upcoming bills" list
  useEffect(() => {
    const today = new Date();
    const in30 = addDays(today, 30);
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const resp = await axios.get(`http://localhost:8000/user_transactions/?start_date=${formatISO(today)}&end_date=${formatISO(in30)}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        const all = [ 
          ...(resp.data.db_transactions || []), 
          ...(resp.data.plaid_transactions || []),
          ...(resp.data.user_transactions || []),
          ...(resp.data.recurring_transactions || [])
        ];
        // treat upcoming as those with date >= today
        const filtered = all.filter(tx => new Date(tx.date) >= today).sort((a,b) => new Date(a.date) - new Date(b.date));
        setUpcoming(filtered.slice(0,10));
      } catch (e) {
        console.error('upcoming fetch', e);
      }
    })();
  }, []);

  const days = useMemo(() => {
    if (mode === 'week') return Array.from({length:7}).map((_,i) => addDays(weekStart, i));
    // month grid: compute weeks for the monthBase, but stop when we've covered the month
    const first = startOfMonth(monthBase);
    const last = endOfMonth(monthBase);
    const start = startOfWeek(first);
    const weeks = [];
    let cur = new Date(start);
    
    while (cur <= last) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cur));
        cur = addDays(cur, 1);
      }
      weeks.push(week);
      
      // if the first day of this week is already past the end of the month, break
      if (week[0] > last) break;
    }
    return weeks;
  }, [mode, weekStart, monthBase]);

  const dayNet = (date) => {
    const key = formatISO(date);
    const list = eventsByDate[key] || [];
    const net = list.reduce((s,tx) => s + (tx.amount || 0), 0);
    return net;
  };

  return (
    <Box sx={{ p: 1, overflowX: 'hidden', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={() => {
            if (mode === 'week') setWeekStart(prev => addDays(prev, -7));
            else setMonthBase(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
          }}><ArrowBackIosNewIcon fontSize="small"/></IconButton>
          <Typography sx={{ mx: 1, fontWeight: 600 }}>
            {mode === 'week' ? `${weekStart.toLocaleDateString()} - ${addDays(weekStart,6).toLocaleDateString()}` : `${monthBase.toLocaleString(undefined,{month:'long', year:'numeric'})}`}
          </Typography>
          <IconButton onClick={() => {
            if (mode === 'week') setWeekStart(prev => addDays(prev, 7));
            else setMonthBase(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });
          }}><ArrowForwardIosIcon fontSize="small"/></IconButton>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, val) => { if (val) setMode(val); }}
            size="small"
          >
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
          </ToggleButtonGroup>
          <Button size="small" onClick={() => { setWeekStart(startOfWeek(new Date())); setMonthBase(startOfMonth(new Date())); }}>Today</Button>
        </Box>
      </Box>

      {mode === 'week' ? (
        <Box sx={{ width: '100%', boxSizing: 'border-box', overflowX: { xs: 'auto', sm: 'hidden' }, p: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(7, minmax(160px, 1fr))', sm: 'repeat(7, 1fr)' }, gap: { xs: 0.5, sm: 0.8 }, alignItems: 'start', gridAutoRows: 'minmax(120px, auto)' }}>
            {days.map(day => {
            const key = formatISO(day);
            const list = eventsByDate[key] || [];
            const net = dayNet(day);
            const isToday = formatISO(new Date()) === key;
            const bg = isToday ? 'rgba(25, 118, 210, 0.1)' : (net < 0 ? 'rgba(244, 67, 54, 0.06)' : (net > 0 ? 'rgba(76,175,80,0.06)' : undefined));
            return (
              <Paper key={key} sx={{ 
                p: { xs: 0.4, sm: 0.75 }, 
                minHeight: 120, 
                display: 'flex', 
                flexDirection: 'column', 
                background: bg,
                border: isToday ? '2px solid' : 'none',
                borderColor: isToday ? 'primary.main' : 'transparent',
                position: 'relative'
              }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>{day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>{list.length}</Typography>
                </Box>
                <Divider sx={{ my: 0.4 }} />
                <Box sx={{ overflow: 'hidden' }}>
                  <List dense>
                    {list.slice(0,3).map(tx => (
                      <ListItem key={tx.transaction_id} button dense onClick={() => setOpenDay(key)}>
                        <ListItemText primary={tx.merchant_name || tx.category || 'Unknown'} secondary={`$${Math.abs(tx.amount).toFixed(2)}`} primaryTypographyProps={{ noWrap: true, sx: { fontSize: '0.78rem' } }} secondaryTypographyProps={{ sx: { fontSize: '0.72rem' } }} />
                      </ListItem>
                    ))}
                    {list.length > 3 && (
                      <ListItem button dense onClick={() => setOpenDay(key)}>
                        <ListItemText primary={`+${list.length - 3} more`} primaryTypographyProps={{ sx: { fontSize: '0.72rem' } }} />
                      </ListItem>
                    )}
                  </List>
                </Box>
                <Button 
                  size="small" 
                  onClick={() => setOpenDay(key)} 
                  sx={{ 
                    position: 'absolute', 
                    bottom: 4, 
                    right: 4,
                    minWidth: 44,
                    px: 1,
                    fontSize: '0.7rem',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,1)'
                    }
                  }}
                >
                  View
                </Button>
              </Paper>
            );
          })}
          </Box>
        </Box>
      ) : (
        // month grid - calendar widget style
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, maxWidth: '70%', width: '70%' }}>
            {days.flat().map(day => {
              const key = formatISO(day);
              const list = eventsByDate[key] || [];
              const net = dayNet(day);
              const inMonth = day.getMonth() === monthBase.getMonth();
              const isToday = formatISO(new Date()) === key;
              const bg = isToday && inMonth ? 'rgba(25, 118, 210, 0.1)' : 
                         (net < 0 ? 'rgba(244, 67, 54, 0.04)' : (net > 0 ? 'rgba(76,175,80,0.04)' : undefined));
              
              const tooltipContent = list.length > 0 ? list.map(tx => 
                `${tx.merchant_name || tx.category} • $${Math.abs(tx.amount).toFixed(2)}`
              ).join('\n') : 'No transactions';
              
              return (
                <Box 
                  key={key} 
                  title={tooltipContent}
                  onClick={() => list.length > 0 && setOpenDay(key)}
                  sx={{ 
                    aspectRatio: '1',
                    display: 'flex', 
                    flexDirection: 'column', 
                    background: inMonth ? bg : 'transparent', 
                    opacity: inMonth ? 1 : 0.45,
                    border: isToday && inMonth ? '2px solid' : '1px solid',
                    borderColor: isToday && inMonth ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    cursor: list.length > 0 ? 'pointer' : 'default',
                    position: 'relative',
                    p: 0.5,
                    '&:hover': list.length > 0 ? {
                      backgroundColor: 'action.hover',
                      transform: 'scale(1.02)',
                      transition: 'all 0.2s ease'
                    } : {}
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: isToday && inMonth ? 700 : (inMonth ? 500 : 400), 
                      fontSize: '0.7rem',
                      alignSelf: 'flex-start',
                      lineHeight: 1,
                      color: isToday && inMonth ? 'primary.main' : 'inherit'
                    }}
                  >
                    {day.getDate()}
                  </Typography>
                  
                  {list.length > 0 && (
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 0.2, 
                      flexWrap: 'wrap', 
                      justifyContent: 'center',
                      alignItems: 'center',
                      flex: 1,
                      mt: 0.5
                    }}>
                      {list.slice(0,4).map((tx, idx) => (
                        <Box 
                          key={idx} 
                          sx={{ 
                            width: 4, 
                            height: 4, 
                            borderRadius: '50%', 
                            backgroundColor: tx.amount < 0 ? 'error.main' : 'success.main'
                          }} 
                        />
                      ))}
                      {list.length > 4 && (
                        <Typography variant="caption" sx={{ fontSize: '0.5rem', color: 'text.secondary' }}>
                          +{list.length - 4}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      <Paper elevation={1} sx={{ p: 2, mt: 2, backgroundColor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'primary.main' }} />
            Upcoming Transactions
            <Typography variant="caption" color="text.secondary">(next 30 days)</Typography>
          </Typography>
          <Button 
            variant="contained" 
            size="small" 
            onClick={() => setIsAddOpen(true)}
            sx={{ minWidth: 'auto', px: 1.5 }}
          >
            + Add
          </Button>
        </Box>
        
        {upcoming.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
            <Typography variant="body2">No upcoming transactions</Typography>
          </Box>
        ) : (
          <Grid container spacing={1}>
            {upcoming.slice(0, 6).map(tx => (
              <Grid item xs={12} sm={6} md={4} key={tx.transaction_id}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 1.5, 
                    border: 1, 
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                  onClick={() => setOpenDay(tx.date)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {tx.merchant_name || tx.category}
                        </Typography>
                        {tx.is_recurring && (
                          <Chip 
                            label="Recurring" 
                            size="small" 
                            color="secondary" 
                            variant="outlined"
                            sx={{ height: 16, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(tx.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600,
                        color: tx.amount < 0 ? 'error.main' : 'success.main'
                      }}
                    >
                      ${Math.abs(tx.amount).toFixed(2)}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      <Drawer anchor="right" open={!!openDay} onClose={() => setOpenDay(null)}>
        <Box sx={{ width: 420, p:2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{openDay}</Typography>
            <Button size="small" onClick={() => setIsAddOpen(true)}>Add</Button>
          </Box>
          <Divider sx={{ my:1 }} />
          <List>
            {(eventsByDate[openDay] || []).map(tx => (
              <React.Fragment key={tx.transaction_id}>
                <ListItem>
                  <ListItemText primary={tx.merchant_name || tx.category} secondary={new Date(tx.date).toLocaleString()} />
                  <Box sx={{ ml:2, color: tx.amount < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>${Math.abs(tx.amount).toFixed(2)}</Box>
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
            {(!eventsByDate[openDay] || eventsByDate[openDay].length === 0) && (
              <ListItem>
                <ListItemText primary="No transactions" />
              </ListItem>
            )}
          </List>

        </Box>
      </Drawer>

      {/* Add Transaction Dialog - moved outside drawer */}
      <AddTransactionDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        defaultDate={openDay}
        onCreated={(tx) => {
          // Immediately update local eventsByDate for instant UI feedback
          setEventsByDate(prev => {
            const copy = { ...prev };
            const key = tx.date;
            copy[key] = [ ...(copy[key] || []), tx ];
            return copy;
          });
          // refresh in background and refresh upcoming
          refreshCurrentRange();
          setOpenDay(tx.date);
        }}
      />
    </Box>
  );
}
