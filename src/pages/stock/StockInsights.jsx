import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Container, Typography, Button, Paper, Table,
  TableHead, TableRow, TableCell, TableBody, CircularProgress
} from "@mui/material";

import SearchBar from "../../components/common/SearchBar";
import SymbolOverviewChart from "../../components/common/tradingview/SymbolOverviewChart";
import StockInfoPanel from "./components/StockInfoPanel";
import StockOscillatorsPanel from "./components/StockOscillatorsPanel";
import api from "../../api";

function StockInsights() {
  const { ticker } = useParams();
  const navigate = useNavigate();

  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvedSymbol, setResolvedSymbol] = useState(null);

  const fetchPredictions = async () => {
    try {
      setLoading(true);

      const res = await api.get(`/stocks/predictions/history/${ticker}?hours_back=24`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      const sorted = res.data.sort(
        (a, b) => new Date(b.prediction_time) - new Date(a.prediction_time)
      );

      const latest = sorted.slice(0, 5).map(p => [
        `${p.horizon_minutes}m`,
        `$${p.predicted_price.toFixed(2)}`,
        `±${p.confidence_high ? (p.confidence_high - p.predicted_price).toFixed(2) : "—"}`
      ]);

      setPredictions(latest);
    } finally {
      setLoading(false);
    }
  };

  const fetchSymbol = async () => {
    try {
      const res = await api.get(`/stocks/symbol/${ticker}`);
      setResolvedSymbol(res.data.symbol);
    } catch {
      setResolvedSymbol(`NASDAQ:${ticker}`);
    }
  };

  useEffect(() => {
    fetchSymbol();
    fetchPredictions();
  }, [ticker]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Button variant="contained" onClick={() => navigate("/stock")}>← Back</Button>
        <SearchBar placeholder="Search stocks..." />
      </Box>

      <Typography variant="h4" textAlign="center">{ticker} — Stock Details</Typography>

      <Box display="flex" gap={3} mt={3}>
        <Paper sx={{ flex: 2, p: 2 }}>
          <SymbolOverviewChart symbol={resolvedSymbol} theme="light" />
        </Paper>

        <Paper sx={{ flex: 1, p: 3 }}>
          <Typography variant="h6" textAlign="center">Recent Predictions</Typography>

          {loading ? (
            <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center">Interval</TableCell>
                  <TableCell align="center">Predicted Price</TableCell>
                  <TableCell align="center">Confidence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {predictions.map(([i, p, c]) => (
                  <TableRow key={i}>
                    <TableCell align="center">{i}</TableCell>
                    <TableCell align="center">{p}</TableCell>
                    <TableCell align="center">{c}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Box>

      <StockOscillatorsPanel ticker={ticker} />
      <StockInfoPanel ticker={ticker} />
    </Container>
  );
}

export default StockInsights;