import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Box, Grid, Paper, Typography, IconButton, Button, List, ListItem, ListItemText, Divider, Drawer, ToggleButton, ToggleButtonGroup } from '@mui/material';
import AddTransactionDialog from './popups/AddTransactionDialog';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const formatISO = (d) => d.toISOString().slice(0,10);

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun - 6 Sat
  const diff = (day + 6) % 7; // Monday as start
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

export default function WeeklyOverview() {
  const [mode, setMode] = useState('week'); // or 'month'
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [monthBase, setMonthBase] = useState(() => startOfMonth(new Date()));
  const [eventsByDate, setEventsByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [openDay, setOpenDay] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [upcoming, setUpcoming] = useState([]);

  // fetch for a given range
  const fetchRange = async (start, end) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const resp = await axios.get(`http://localhost:8000/user_transactions/?start_date=${formatISO(start)}&end_date=${formatISO(end)}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      const all = [ ...(resp.data.db_transactions || []), ...(resp.data.plaid_transactions || []) ];
      const grouped = {};
      all.forEach(tx => {
        const d = tx.date;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(tx);
      });
      Object.keys(grouped).forEach(k => grouped[k].sort((a,b) => new Date(b.date) - new Date(a.date)));
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

  // Week fetch
  useEffect(() => {
    if (mode !== 'week') return;
    const start = weekStart;
    const end = addDays(weekStart, 6);
    fetchRange(start, end);
  }, [weekStart, mode]);

  // Month fetch
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
        const all = [ ...(resp.data.db_transactions || []), ...(resp.data.plaid_transactions || []) ];
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
    // month grid: compute weeks for the monthBase
    const first = startOfMonth(monthBase);
    const start = startOfWeek(first);
    const weeks = [];
    let cur = new Date(start);
    for (let w = 0; w < 6; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cur));
        cur = addDays(cur, 1);
      }
      weeks.push(week);
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
    <Paper elevation={1} sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
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

      {/* Upcoming small list */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Upcoming (next 30d)</Typography>
        <List dense sx={{ maxHeight: 80, overflow: 'auto' }}>
          {upcoming.length === 0 ? (
            <ListItem><ListItemText primary="No upcoming items" /></ListItem>
          ) : upcoming.map(tx => (
            <ListItem key={tx.transaction_id} button onClick={() => setOpenDay(tx.date)}>
              <ListItemText primary={tx.merchant_name || tx.category} secondary={tx.date} />
              <Box sx={{ ml:1, color: tx.amount < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>${Math.abs(tx.amount).toFixed(2)}</Box>
            </ListItem>
          ))}
        </List>
      </Box>

      {mode === 'week' ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Grid container spacing={1} sx={{ width: 'max-content', minWidth: '100%' }}>
            {days.map(day => {
            const key = formatISO(day);
            const list = eventsByDate[key] || [];
            const net = dayNet(day);
            const bg = net < 0 ? 'rgba(244, 67, 54, 0.06)' : (net > 0 ? 'rgba(76,175,80,0.06)' : undefined);
              return (
                <Grid key={key} item sx={{ minWidth: 160 }}>
                  <Paper sx={{ p:1, height: 160, width: 160, display: 'flex', flexDirection: 'column', background: bg }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">{day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}</Typography>
                    <Typography variant="caption" color="text.secondary">{list.length}</Typography>
                  </Box>
                  <Divider sx={{ my: 0.5 }} />
                  <Box sx={{ overflow: 'auto', flex: 1 }}>
                    <List dense>
                      {list.slice(0,4).map(tx => (
                        <ListItem button key={tx.transaction_id} onClick={() => setOpenDay(key)}>
                          <ListItemText primary={tx.merchant_name || tx.category || 'Unknown'} secondary={`$${Math.abs(tx.amount).toFixed(2)}`} />
                        </ListItem>
                      ))}
                      {list.length > 4 && (
                        <ListItem button onClick={() => setOpenDay(key)}>
                          <ListItemText primary={`+${list.length - 4} more`} />
                        </ListItem>
                      )}
                    </List>
                  </Box>
                  <Box display="flex" justifyContent="flex-end" sx={{ mt: 0.5 }}>
                    <Button size="small" onClick={() => setOpenDay(key)}>View</Button>
                  </Box>
                </Paper>
                </Grid>
              );
          })}
          </Grid>
        </Box>
      ) : (
        // month grid
        <Box>
          {days.map((week, wi) => (
            <Grid container spacing={1} key={wi} sx={{ mb: 0.5 }}>
              {week.map(day => {
                const key = formatISO(day);
                const list = eventsByDate[key] || [];
                const net = dayNet(day);
                const inMonth = day.getMonth() === monthBase.getMonth();
                const bg = net < 0 ? 'rgba(244, 67, 54, 0.06)' : (net > 0 ? 'rgba(76,175,80,0.06)' : undefined);
                return (
                  <Grid item xs={12} sm={6} md={Math.floor(12/7)} key={key} sx={{ minWidth: 120 }}>
                    <Paper sx={{ p:1, height: 120, display: 'flex', flexDirection: 'column', background: inMonth ? bg : 'transparent', opacity: inMonth ? 1 : 0.45 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption">{day.getDate()}</Typography>
                        <Typography variant="caption" color="text.secondary">{list.length}</Typography>
                      </Box>
                      <Divider sx={{ my: 0.5 }} />
                      <Box sx={{ overflow: 'auto', flex: 1 }}>
                        <List dense>
                          {list.slice(0,3).map(tx => (
                            <ListItem button key={tx.transaction_id} onClick={() => setOpenDay(key)}>
                              <ListItemText primary={tx.merchant_name || tx.category} secondary={`$${Math.abs(tx.amount).toFixed(2)}`} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          ))}
        </Box>
      )}

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
          {isAddOpen && (
            <AddTransactionDialog
              open={isAddOpen}
              onClose={() => setIsAddOpen(false)}
              defaultDate={openDay}
              onCreated={(tx) => {
                // refresh the current range to include the new transaction
                refreshCurrentRange();
                setOpenDay(tx.date);
              }}
            />
          )}
        </Box>
      </Drawer>
    </Paper>
  );
}
