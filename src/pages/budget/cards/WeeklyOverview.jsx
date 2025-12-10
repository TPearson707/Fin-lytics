import React, { useEffect, useMemo, useState } from 'react';
// Removed duplicate Dialog imports; use those from main MUI import
import axios from 'axios';
import { Box, Grid, Paper, Typography, IconButton, Button, List, ListItem, ListItemText, Divider, Drawer, ToggleButton, ToggleButtonGroup, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Chip, CircularProgress, Snackbar, Alert } from '@mui/material';
import AddTransactionDialog from '../popups/add-transaction';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import RefreshIcon from '@mui/icons-material/Refresh';

const formatISO = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('T')[0].split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [mode, setMode] = useState('week'); // or 'month'
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [monthBase, setMonthBase] = useState(() => startOfMonth(new Date()));
  const [eventsByDate, setEventsByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // overlay state
  const [openDay, setOpenDay] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, tx: null, date: null });
  const [upcoming, setUpcoming] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [cache, setCache] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [categoryColors, setCategoryColors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  // get user categories with colors
  const fetchCategoryColors = async () => {
    try {
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
      console.log('Calendar: Fetched category colors:', colorMap);
      setCategoryColors(colorMap);
    } catch (error) {
      console.error('Error fetching category colors:', error);
    }
  };

  // function to get category color
  const getCategoryColor = (category) => {
    if (!category) return '#9E9E9E';
    const norm = category.trim().toLowerCase();
    let color = categoryColors[norm];
    if (!color) {
      // Try to find a close match
      const matchingKey = Object.keys(categoryColors).find(
        key => key === norm
      );
      if (matchingKey) {
        color = categoryColors[matchingKey];
      }
    }
    if (!color) {
      console.warn('Category color not found for:', category, 'Normalized:', norm, 'Available:', Object.keys(categoryColors));
    } else {
      console.log('Category color found for:', category, 'Normalized:', norm, '=>', color);
    }
    return color || '#9E9E9E';
  };

  // fetch for a given range
  // If force=true, always refetch from backend and update cache
  const fetchRange = async (start, end, force = false) => {
    const key = `${formatISO(start)}_${formatISO(end)}`;
    if (!force && cache[key]) {
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

  // Overlayed refresh for both calendar and upcoming
  const refreshCurrentRange = async () => {
    setRefreshing(true);
    if (mode === 'week') {
      await fetchRange(weekStart, addDays(weekStart,6), true);
    } else {
      await fetchRange(startOfMonth(monthBase), endOfMonth(monthBase), true);
    }
    // Also refresh upcoming
    const today = new Date();
    const in30 = addDays(today, 30);
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
      const filtered = all.filter(tx => new Date(tx.date) >= today).sort((a,b) => new Date(a.date) - new Date(b.date));
      setUpcoming(filtered.slice(0,10));
    } catch (e) {
      setUpcoming([]);
    }
    setRefreshing(false);
  };

  // fetch category colors on mount
  useEffect(() => {
    fetchCategoryColors();
  }, []);

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

  // Debug: log all categories in current eventsByDate
  useEffect(() => {
    const allCategories = Object.values(eventsByDate).flat().map(tx => tx.category);
    console.log('All transaction categories in view:', allCategories);
  }, [eventsByDate]);

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
          <IconButton onClick={refreshCurrentRange} aria-label="refresh" sx={{ ml: 2 }}>
          <RefreshIcon />
        </IconButton>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, val) => { if (val) setMode(val); }}
            size="small"
          >
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
          </ToggleButtonGroup>
          <Button size="small" variant="outlined" sx={{ marginRight: 2, padding: 0.6 }} onClick={() => { setWeekStart(startOfWeek(new Date())); setMonthBase(startOfMonth(new Date())); }}>Today</Button>
        </Box>
      </Box>

      {mode === 'week' ? (
        <Box sx={{ width: '100%', boxSizing: 'border-box', overflowX: { xs: 'auto', sm: 'hidden' }, p: 1, position: 'relative' }}>
          {refreshing && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'all' }}>
              <CircularProgress />
            </Box>
          )}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(7, minmax(160px, 1fr))', sm: 'repeat(7, 1fr)' }, gap: { xs: 0.5, sm: 0.8 }, alignItems: 'start', gridAutoRows: 'minmax(120px, auto)' }}>
            {days.map(day => {
            const key = formatISO(day);
            const list = eventsByDate[key] || [];
            const net = dayNet(day);
            const isToday = formatISO(new Date()) === key;
            const bg = isToday ? 'rgba(25, 118, 210, 0.1)' : undefined;
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
                <Box sx={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  maxHeight: '100px',
                  '&::-webkit-scrollbar': {
                    width: '4px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    borderRadius: '2px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '2px',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    },
                  },
                }}>
                  <List dense>
                    {list.map(tx => (
                      <ListItem 
                        key={tx.transaction_id} 
                        button 
                        dense 
                        onClick={() => setOpenDay(key)}
                        sx={{ 
                          py: 0.25, 
                          minHeight: '28px',
                          borderRadius: 1,
                          mb: 0.25,
                          backgroundColor: getCategoryColor(tx.category) + '15', // 15 for light opacity
                          border: `1px solid ${getCategoryColor(tx.category)}40`, // 40 for border opacity
                          '&:hover': {
                            backgroundColor: getCategoryColor(tx.category) + '25',
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
                          <Box 
                            sx={{ 
                              width: 6, 
                              height: 6, 
                              borderRadius: '50%', 
                              backgroundColor: getCategoryColor(tx.category),
                              flexShrink: 0
                            }} 
                          />
                          <ListItemText 
                            primary={tx.merchant_name || tx.category || 'Unknown'} 
                            secondary={`$${Math.abs(tx.amount).toFixed(2)}`} 
                            primaryTypographyProps={{ 
                              noWrap: true, 
                              sx: { fontSize: '0.7rem', fontWeight: 500 } 
                            }} 
                            secondaryTypographyProps={{ 
                              sx: { 
                                fontSize: '0.65rem',
                                color: tx.amount < 0 ? 'error.main' : 'success.main',
                                fontWeight: 600
                              } 
                            }} 
                          />
                        </Box>
                      </ListItem>
                    ))}
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
                      flexDirection: 'column',
                      gap: 0.2, 
                      flex: 1,
                      mt: 0.5,
                      overflow: 'hidden'
                    }}>
                      {list.slice(0,3).map((tx, idx) => (
                        <Box 
                          key={idx}
                          sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.3,
                            backgroundColor: getCategoryColor(tx.category) + '20', // 20 for light opacity
                            borderRadius: '6px',
                            px: 0.4,
                            py: 0.2,
                            minHeight: '12px'
                          }}
                        >
                          <Box 
                            sx={{ 
                              width: 3, 
                              height: 3, 
                              borderRadius: '50%', 
                              backgroundColor: getCategoryColor(tx.category),
                              flexShrink: 0
                            }} 
                          />
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontSize: '0.45rem', 
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                              color: 'text.primary'
                            }}
                          >
                            {tx.merchant_name || tx.category || 'Unknown'}
                          </Typography>
                        </Box>
                      ))}
                      {list.length > 3 && (
                        <Typography variant="caption" sx={{ 
                          fontSize: '0.4rem', 
                          color: 'text.secondary',
                          textAlign: 'center',
                          fontWeight: 600
                        }}>
                          +{list.length - 3} more
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
          <Box sx={{ maxHeight: 220, overflowY: 'auto', pr: 1 }}>
            <Grid container spacing={1}>
            {upcoming.map(tx => (
              <Grid item xs={12} sm={6} md={4} key={tx.transaction_id}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 1.5, 
                    border: 1, 
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' },
                    mb: 1
                  }}
                  onClick={() => { setSelectedTransaction(tx); setOpenDay(tx.date); }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: '44px' }}>
                    <Box sx={{ flex: 1, mr: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Box 
                          sx={{ 
                            width: 10, 
                            height: 10, 
                            borderRadius: '50%', 
                            backgroundColor: getCategoryColor(tx.category),
                            border: '1.5px solid #fff',
                            boxShadow: '0 0 0 1.5px ' + getCategoryColor(tx.category),
                            flexShrink: 0
                          }} 
                        />
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {tx.merchant_name || tx.category}
                        </Typography>
                        {tx.is_recurring && (
                          <Chip 
                            label="recurring" 
                            size="small" 
                            color="secondary" 
                            variant="outlined"
                            sx={{ height: 16, fontSize: '0.65rem', flexShrink: 0, ml: 0.5 }}
                          />
                        )}
                        {/* Category chip removed for upcoming transactions */}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                        {new Date(tx.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600,
                          color: tx.amount < 0 ? 'error.main' : 'success.main',
                          lineHeight: 1.2
                        }}
                      >
                        ${Math.abs(tx.amount).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        {tx.amount < 0 ? 'expense' : 'income'}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
            </Grid>
          </Box>
        )}
        {/* Only one refresh overlay should exist, so this is removed. */}
      </Paper>

      <Drawer anchor="right" open={!!openDay || !!selectedTransaction} onClose={() => { setOpenDay(null); setSelectedTransaction(null); setEditData(null); setIsAddOpen(false); }}>
        <Box sx={{ width: 420, p:2, position: 'relative' }}>
          {selectedTransaction ? (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Transaction Details</Typography>
                <Button size="small" onClick={() => setIsAddOpen(true)}>Add</Button>
              </Box>
              <Divider sx={{ my:1 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{selectedTransaction.merchant_name || 'Unknown'}</Typography>
                  <Typography variant="caption" color="text.secondary">{new Date(selectedTransaction.date).toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: selectedTransaction.amount < 0 ? 'error.main' : 'success.main' }}>
                    {`$${Math.abs(selectedTransaction.amount).toFixed(2)}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{selectedTransaction.amount < 0 ? 'expense' : 'income'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {/* Category chip with color */}
                  {selectedTransaction.category && (
                    <Chip 
                      label={getCategoryColor(selectedTransaction.category) === '#9E9E9E' ? `${selectedTransaction.category} (unmapped)` : selectedTransaction.category}
                      size="small"
                      sx={{ backgroundColor: getCategoryColor(selectedTransaction.category), color: '#fff', textTransform: 'capitalize', border: getCategoryColor(selectedTransaction.category) === '#9E9E9E' ? '1.5px dashed #888' : undefined }}
                    />
                  )}
                  {selectedTransaction.is_recurring && <Chip label="recurring" size="small" variant="outlined" sx={{ color: 'info.main', borderColor: 'info.main' }} />}
                  <Chip label={selectedTransaction.source || 'unknown'} size="small" variant="outlined" />
                </Box>
                {/* Details removed per UI update */}
              </Box>
            </Box>
          ) : (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{openDay}</Typography>
                <Button size="small" onClick={() => setIsAddOpen(true)}>Add</Button>
              </Box>
              <Divider sx={{ my:1 }} />
              {/* Edit hint */}
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Click a transaction below to edit it.
              </Typography>
              <List>
                {(eventsByDate[openDay] || []).map(tx => (
                  <React.Fragment key={tx.transaction_id}>
                    <ListItem sx={{ 
                      backgroundColor: getCategoryColor(tx.category) + '10',
                      borderLeft: `4px solid ${getCategoryColor(tx.category)}`,
                      mb: 0.5,
                      borderRadius: 1,
                      cursor: 'pointer',
                      alignItems: 'center'
                    }}
                    onClick={() => { setEditData(tx); setIsAddOpen(true); }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%', 
                            backgroundColor: getCategoryColor(tx.category)
                          }} 
                        />
                        <ListItemText 
                          primary={tx.merchant_name || tx.category || ''} 
                          secondary={parseLocalDate(tx.date)?.toLocaleString() || tx.date} 
                        />
                        {/* Category chip with color */}
                        {tx.category && (
                          <Chip label={tx.category} size="small" sx={{ backgroundColor: getCategoryColor(tx.category), color: '#fff', ml: 1 }} />
                        )}
                      </Box>
                      <Box sx={{ ml:2, color: tx.amount < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>{`$${Math.abs(tx.amount).toFixed(2)}`}</Box>
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
          )}
        </Box>
      </Drawer>

      <AddTransactionDialog
        open={isAddOpen}
        onClose={() => { setIsAddOpen(false); setEditData(null); }}
        defaultDate={openDay ? openDay : new Date().toISOString().slice(0,10)}
        initialData={editData}
        isEdit={!!editData}
        onCreated={(tx) => {
          setEventsByDate(prev => {
            const key = tx.date;
            const copy = { ...prev };
            copy[key] = [ ...(copy[key] || []), tx ];
            return copy;
          });
          refreshCurrentRange();
          setOpenDay(tx.date);
        }}
        onSubmit={async (payload) => {
          // If editing, merge original transaction with updated fields to avoid missing required fields
          let mergedPayload = payload;
          if (editData) {
            mergedPayload = { ...editData, ...payload, transaction_id: editData.transaction_id };
          }
          setConfirmDialog({ open: true, action: editData ? 'edit' : 'add', tx: mergedPayload, date: payload.date });
        }}
        onDelete={editData ? () => setConfirmDialog({ open: true, action: 'remove', tx: editData, date: editData.date }) : undefined}
      />

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null, tx: null, date: null })}>
        <DialogTitle>Confirm {confirmDialog.action === 'remove' ? 'Remove' : confirmDialog.action === 'edit' ? 'Edit' : 'Add'} Transaction</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to {confirmDialog.action === 'remove' ? 'remove' : confirmDialog.action === 'edit' ? 'edit' : 'add'} this transaction?</Typography>
          {actionLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
              <CircularProgress size={28} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null, tx: null, date: null })} disabled={actionLoading}>Cancel</Button>
          <Button color="primary" disabled={actionLoading} onClick={async () => {
            setActionLoading(true);
            if (confirmDialog.action === 'add') {
              const token = localStorage.getItem('token');
              await axios.post('http://localhost:8000/user_transactions/', confirmDialog.tx, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
              });
              setEventsByDate(prev => {
                const key = confirmDialog.tx.date;
                const copy = { ...prev };
                copy[key] = [ ...(copy[key] || []), confirmDialog.tx ];
                return copy;
              });
              refreshCurrentRange(); // force refetch
              setOpenDay(confirmDialog.tx.date);
              setIsAddOpen(false);
              setEditData(null);
            } else if (confirmDialog.action === 'edit') {
              const token = localStorage.getItem('token');
              // Log and filter payload before sending
              // Remove 'id' and null fields from payload
              const filteredPayload = Object.fromEntries(
                Object.entries(confirmDialog.tx)
                  .filter(([k, v]) => k !== 'id' && v !== undefined && v !== null && v !== '')
              );
              console.log('PUT payload:', filteredPayload);
              // Use numeric id for URL if present, else fallback to transaction_id
              const urlId = confirmDialog.tx.id !== undefined ? confirmDialog.tx.id : confirmDialog.tx.transaction_id;
              await axios.put(`http://localhost:8000/user_transactions/${urlId}`, filteredPayload, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
              });
              setEventsByDate(prev => {
                const key = confirmDialog.tx.date;
                const copy = { ...prev };
                copy[key] = (copy[key] || []).map(t => t.transaction_id === confirmDialog.tx.transaction_id ? confirmDialog.tx : t);
                return copy;
              });
              refreshCurrentRange(); // force refetch
              setOpenDay(confirmDialog.tx.date);
              setIsAddOpen(false);
              setEditData(null);
            } else if (confirmDialog.action === 'remove') {
              const token = localStorage.getItem('token');
              await axios.delete(`http://localhost:8000/user_transactions/${confirmDialog.tx.transaction_id}`, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
              });
              setEventsByDate(prev => {
                const key = confirmDialog.tx.date;
                const copy = { ...prev };
                copy[key] = (copy[key] || []).filter(t => t.transaction_id !== confirmDialog.tx.transaction_id);
                return copy;
              });
              refreshCurrentRange(); // Always update weekly view after delete, force refetch
              setOpenDay(null);
              setEditData(null);
              setIsAddOpen(false);
              setSelectedTransaction(null);
              setSnackbar({ open: true, message: 'Transaction deleted. Please close this dialog and refresh the calendar.', severity: 'success' });
            }
            setActionLoading(false);
            setConfirmDialog({ open: false, action: null, tx: null, date: null });
          }}>Confirm</Button>
        </DialogActions>
      </Dialog>
    <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
        {snackbar.message}
      </Alert>
    </Snackbar>
    </Box>
  );
}
