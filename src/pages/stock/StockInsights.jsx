import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
} from "@mui/material";
import SymbolOverviewChart from "../../../components/common/tradingview/SymbolOverviewChart";
import SearchBar from "../../../components/common/SearchBar";

function StockInsights() {
  const { ticker } = useParams();
  const navigate = useNavigate();

  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const goBack = () => navigate("/stock");

  /** Fetch multi-interval AI predictions for the selected ticker (with cache) */
  async function fetchPredictions(forceRefresh = false) {
    try {
      setLoading(true);
      setError(null);

      const cacheKey = `intervalPredictions_${ticker}`;
      const cacheTimeKey = `intervalPredictionsTime_${ticker}`;
      const cached = localStorage.getItem(cacheKey);
      const cachedTime = localStorage.getItem(cacheTimeKey);

      // Use cache if <5min old unless forceRefresh
      if (!forceRefresh && cached && cachedTime) {
        const age = (Date.now() - Number(cachedTime)) / 1000 / 60;
        if (age < 5) {
          setPredictions(JSON.parse(cached));
          setLastUpdated(new Date(Number(cachedTime)).toLocaleTimeString());
          setLoading(false);
          return;
        }
      }

      // Fetch new data
      const res = await fetch(
        "http://localhost:8000/stocks/predictions/generate-intervals",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ tickers: [ticker] }),
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const intervalOrder = ["5m", "15m", "30m", "1h", "1d"];
      const preds =
        (data?.predictions ?? [])
          .filter((p) => p.ticker === ticker)
          .sort(
            (a, b) =>
              intervalOrder.indexOf(a.interval) -
              intervalOrder.indexOf(b.interval)
          )
          .map((p) => [
            p.interval,
            `$${Number(p.predicted_price).toFixed(2)}`,
            `${p.change >= 0 ? "+" : ""}${p.change.toFixed(2)}%`,
          ]) ?? [];

      setPredictions(preds);
      setLastUpdated(new Date().toLocaleTimeString());

      // Save cache
      localStorage.setItem(cacheKey, JSON.stringify(preds));
      localStorage.setItem(cacheTimeKey, String(Date.now()));
    } catch (err) {
      console.error(err);
      setError("Failed to fetch predictions.");
    } finally {
      setLoading(false);
    }
  }

  // === Fetch on mount and auto-refresh every 5 minutes ===
  useEffect(() => {
    fetchPredictions();
    const interval = setInterval(() => fetchPredictions(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [ticker]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* ===== Top Controls ===== */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Button
          variant="contained"
          onClick={goBack}
          sx={{
            backgroundColor: "#ebf4ff",
            color: "#1a1a1a",
            border: "1px solid #7ea5de",
            "&:hover": { backgroundColor: "#dbeafe" },
          }}
        >
          ← Back to Stocks
        </Button>
        <SearchBar placeholder="Search or jump to stock..." />
      </Box>

      {/* ===== Header ===== */}
      <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
        {ticker} — Stock Details
      </Typography>

      {/* ===== Chart + Predictions ===== */}
      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        gap={3}
        mt={3}
      >
        {/* ===== TradingView Chart ===== */}
        <Paper
          sx={{
            flex: 2,
            p: 2,
            border: "1px solid #7ea5de",
            backgroundColor: "#f9fbff",
            borderRadius: 2,
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 400,
          }}
        >
          <Box sx={{ width: "100%", height: "100%" }}>
            <SymbolOverviewChart symbol={`NASDAQ:${ticker}`} theme="light" />
          </Box>
        </Paper>

        {/* ===== Prediction Table ===== */}
        <Paper
          sx={{
            flex: 1,
            p: 3,
            border: "1px solid #7ea5de",
            backgroundColor: "#f9fbff",
            borderRadius: 2,
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
            height: 400,
            overflowY: "auto",
          }}
        >
          <Typography variant="h6" align="center" mb={2}>
            Projected Predictions
          </Typography>

          {loading ? (
            <Box display="flex" justifyContent="center" mt={5}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error" align="center">
              {error}
            </Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center">Interval</TableCell>
                  <TableCell align="center">Projected Price</TableCell>
                  <TableCell align="center">Change %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {predictions.length > 0 ? (
                  predictions.map(([interval, price, change]) => (
                    <TableRow key={interval}>
                      <TableCell align="center">{interval}</TableCell>
                      <TableCell align="center">{price}</TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          color: change.startsWith("-")
                            ? "#d32f2f"
                            : "#2e7d32",
                          fontWeight: 600,
                        }}
                      >
                        {change}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      No predictions available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {lastUpdated && !loading && (
            <Typography
              variant="body2"
              align="center"
              sx={{
                color: "#777",
                mt: 2,
                fontStyle: "italic",
              }}
            >
              Last updated: {lastUpdated}
            </Typography>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default StockInsights;
