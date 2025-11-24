// ================================
// FILE: StockOscillatorsPanel.jsx — MAN MODE EDITION
// ================================
import React, { useEffect, useRef, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Chip
} from "@mui/material";
import { keyframes } from "@emotion/react";

// 🔥 Pulse Animation
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
`;

// ---------- Mini Sparkline with Thresholds ----------
const Sparkline = ({ data = [], color, thresholdHigh, thresholdLow }) => {
  if (!data.length) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d - min) / (max - min || 1)) * 100;
    return `${x},${y}`;
  }).join(" ");

  const thresholdLine = val => {
    const y = 100 - ((val - min) / (max - min || 1)) * 100;
    return y;
  };

  return (
    <svg width="100%" height="60" viewBox="0 0 100 100">
      {thresholdHigh && <line y1={thresholdLine(thresholdHigh)} y2={thresholdLine(thresholdHigh)} x1="0" x2="100" stroke="#ffaaaa" />}
      {thresholdLow && <line y1={thresholdLine(thresholdLow)} y2={thresholdLine(thresholdLow)} x1="0" x2="100" stroke="#aaaaff" />}
      <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
    </svg>
  );
};

// ---------- Indicator Card ----------
const OscillatorCard = ({ title, value, interpretation, history }) => {
  const prev = useRef(value);

  const delta = prev.current !== null ? (value - prev.current) : 0;
  useEffect(() => { prev.current = value; }, [value]);

  const color =
    interpretation === "Overbought" || interpretation === "Bearish"
      ? "#d32f2f"
      : interpretation === "Oversold"
      ? "#1976d2"
      : "#2e7d32";

  const strength = Math.min(Math.abs(value) / 100 * 100, 100);

  const tooltipMap = {
    RSI: "RSI measures momentum. Over 70 = potential pullback.",
    Stochastic: "Stochastic identifies overbought/oversold signals.",
    MACD: "MACD shows trend direction & strength.",
  };

  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 3,
        height: 220,
        animation: `${pulse} 0.4s`,
        background: `linear-gradient(to bottom right, #ffffff, ${color}22)`
      }}
    >
      <Tooltip title={tooltipMap[title]}>
        <Typography fontWeight={700}>{title}</Typography>
      </Tooltip>

      <Box display="flex" alignItems="center">
        <Typography
          variant="h4"
          fontWeight={800}
          color={color}
          sx={{ animation: delta !== 0 ? `${pulse} 0.5s` : "none" }}
        >
          {value.toFixed(2)}
        </Typography>

        <Typography ml={1} color={color}>
          {delta > 0 ? `▲ +${delta.toFixed(2)}` : delta < 0 ? `▼ ${delta.toFixed(2)}` : ""}
        </Typography>
      </Box>

      <Chip
        label={interpretation}
        size="small"
        sx={{ backgroundColor: color, color: "white", mb: 1 }}
      />

      <Sparkline
        data={history}
        color={color}
        thresholdHigh={title !== "MACD" ? 70 : null}
        thresholdLow={title !== "MACD" ? 30 : null}
      />

      <Box mt={1}>
        <Typography variant="caption">Strength</Typography>
        <Box height={6} background="#ddd" borderRadius={3}>
          <Box width={`${strength}%`} height="100%" background={color} borderRadius={3} />
        </Box>
      </Box>
    </Paper>
  );
};

// ================================
// MAIN PANEL
// ================================
const StockOscillatorsPanel = ({ ticker }) => {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("1day");

  useEffect(() => {
    if (!ticker) return;

    const run = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`http://127.0.0.1:8000/stocks/indicators/all/${ticker}?timeframe=${timeframe}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const json = await res.json();
      const i = json.indicators;

      setData({
        rsi: i?.rsi?.slice(-1)[0]?.rsi ?? 0,
        stochastic: i?.stochastic?.slice(-1)[0]?.stochastic ?? 0,
        macd: i?.macd?.slice(-1)[0]?.macd ?? 0,
      });

      setHistory({
        rsi: i?.rsi?.slice(-20).map(v => v.rsi),
        stochastic: i?.stochastic?.slice(-20).map(v => v.stochastic),
        macd: i?.macd?.slice(-20).map(v => v.macd)
      });

      setLoading(false);
    };

    run();
  }, [ticker, timeframe]);

  if (loading) return <CircularProgress />;

  return (
    <Box mt={5}>
      <Typography align="center" fontWeight={800}>Oscillator Indicators</Typography>

      <Box display="flex" justifyContent="center" mb={2}>
        <ToggleButtonGroup value={timeframe} exclusive onChange={(_, v) => v && setTimeframe(v)}>
          {["1min","5min","15min","1hour","1day"].map(t =>
            <ToggleButton key={t} value={t} sx={{
              boxShadow: timeframe === t ? "0 0 6px #1976d2" : ""
            }}>{t}</ToggleButton>
          )}
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={2} justifyContent="center">
        <Grid item md={4}><OscillatorCard title="RSI" value={data.rsi} interpretation={data.rsi >= 70 ? "Overbought" : data.rsi <= 30 ? "Oversold" : "Neutral"} history={history.rsi}/></Grid>
        <Grid item md={4}><OscillatorCard title="Stochastic" value={data.stochastic} interpretation={data.stochastic >= 80 ? "Overbought" : data.stochastic <= 20 ? "Oversold" : "Neutral"} history={history.stochastic}/></Grid>
        <Grid item md={4}><OscillatorCard title="MACD" value={data.macd} interpretation={data.macd > 0 ? "Bullish" : "Bearish"} history={history.macd}/></Grid>
      </Grid>

      <Box mt={3} textAlign="center">
        <Chip label={`Overall Signal: ${data.rsi > 70 ? "Overheated" : data.macd > 0 ? "Bullish Momentum" : "Mixed Signals"}`} />
      </Box>
    </Box>
  );
};

export default StockOscillatorsPanel;
