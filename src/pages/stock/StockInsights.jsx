import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Container, Typography, Button, Paper, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress } from "@mui/material";
import SymbolOverviewChart from "../../components/common/tradingview/SymbolOverviewChart";
import SearchBar from "../../components/common/SearchBar";
import StockInfoPanel from "./components/StockInfoPanel";
import StockOscillatorsPanel from "./components/StockOscillatorsPanel";

function StockInsights() {
  const { ticker } = useParams();
  const navigate = useNavigate();

  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [resolvedSymbol, setResolvedSymbol] = useState(null);

  const goBack = () => navigate("/stock");

  const fetchResolvedSymbol = async () => {
    try {
      const res = await fetch(`http://localhost:8000/stocks/symbol/${ticker}`);
      const data = await res.json();
      setResolvedSymbol(data.symbol);
    } catch {
      setResolvedSymbol(`NASDAQ:${ticker}`);
    }
  };

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/stocks/predictions/generate-intervals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ tickers: [ticker] }),
      });

      const data = await res.json();

      const intervalOrder = ["5m", "15m", "30m", "1h", "1d"];
      const preds = (data?.predictions ?? [])
        .filter(p => p.ticker === ticker)
        .sort((a, b) => intervalOrder.indexOf(a.interval) - intervalOrder.indexOf(b.interval))
        .map(p => [
          p.interval,
          `$${Number(p.predicted_price).toFixed(2)}`,
          `${p.change >= 0 ? "+" : ""}${p.change.toFixed(2)}%`,
        ]);

      setPredictions(preds);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setError("Failed to fetch predictions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResolvedSymbol();
    fetchPredictions();
  }, [ticker]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Button variant="contained" onClick={goBack}>← Back to Stocks</Button>
        <SearchBar placeholder="Search or jump to stock..." />
      </Box>

      <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
        {ticker} — Stock Details
      </Typography>

      <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={3} mt={3}>
        <Paper sx={{ flex: 2, p: 2, height: 400 }}>
          <SymbolOverviewChart symbol={resolvedSymbol || `NASDAQ:${ticker}`} theme="light" />
        </Paper>

        <Paper sx={{ flex: 1, p: 3, height: 400 }}>
          <Typography variant="h6" align="center" mb={2}>Projected Predictions</Typography>

          {loading ? (
            <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
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
                {predictions.map(([i, p, c]) => (
                  <TableRow key={i}>
                    <TableCell align="center">{i}</TableCell>
                    <TableCell align="center">{p}</TableCell>
                    <TableCell align="center" sx={{ color: c.startsWith("-") ? "#d32f2f" : "#2e7d32" }}>{c}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {lastUpdated && !loading && (
            <Typography align="center" variant="body2" mt={2}>Last updated: {lastUpdated}</Typography>
          )}
        </Paper>
      </Box>

      <StockOscillatorsPanel ticker={ticker} />
      <StockInfoPanel ticker={ticker} />
    </Container>
  );
}

export default StockInsights;
