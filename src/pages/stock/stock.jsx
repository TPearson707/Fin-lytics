import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from "@mui/material";

import SearchBar from "../../components/common/SearchBar";
import Paywall from "../../components/paywall/Paywall";
import api from "../../api";

function Stock() {
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  const [loadingMovers, setLoadingMovers] = useState(true);
  const [error, setError] = useState(null);
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleRowClick = (ticker) => navigate(`${ticker}`);

  const fetchPredictions = async () => {
    try {
      setLoadingPredictions(true);

      const res = await api.get("/stocks/predictions/latest?limit=20", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      const formatted = res.data.map((p) => [
        p.ticker,
        `$${p.predicted_price.toFixed(2)}`,
        p.confidence_low && p.confidence_high
          ? `$${p.confidence_low.toFixed(2)} – $${p.confidence_high.toFixed(2)}`
          : "—",
        new Date(p.prediction_time).toLocaleString(),
      ]);

      setPredictions(formatted);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Prediction fetch error:", err);
      setError("Failed to load predictions");
    } finally {
      setLoadingPredictions(false);
    }
  };

  const fetchMarketMovers = async () => {
    try {
      setLoadingMovers(true);

      const [g, l] = await Promise.all([
        api.get("/stocks/gainers"),
        api.get("/stocks/losers"),
      ]);

      setGainers(g.data);
      setLosers(l.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMovers(false);
    }
  };

  const checkSubscription = async () => {
    try {
      const response = await api.get("/stripe/subscription/status");
      setHasSubscription(response.data.has_subscription);
    } catch {
      setHasSubscription(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  useEffect(() => {
    checkSubscription();
    fetchMarketMovers();
  }, []);

  useEffect(() => {
    if (hasSubscription) {
      fetchPredictions();
      const interval = setInterval(fetchPredictions, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [hasSubscription]);

  if (checkingSubscription)
    return (
      <Container sx={{ mt: 5, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );

  if (!hasSubscription)
    return (
      <Container maxWidth="lg" sx={{ mt: 5 }}>
        <Typography variant="h4" align="center" fontWeight={700} mb={2}>
          Stock Predictions Dashboard
        </Typography>
        <Box display="flex" justifyContent="center" mb={3}>
          <SearchBar placeholder="Search stocks..." />
        </Box>
        <Paywall />
      </Container>
    );

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
        Stock Predictions Dashboard
      </Typography>

      <Box display="flex" justifyContent="center" mb={3}>
        <SearchBar placeholder="Search..." />
      </Box>

      {lastUpdated && (
        <Typography
          variant="body2"
          textAlign="center"
          sx={{ color: "#777", fontStyle: "italic" }}
        >
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Typography>
      )}

      {/* -------- Predictions Table ---------- */}
      <Typography variant="h6" textAlign="center" mt={4}>
        Chronos Predictions
      </Typography>

      {loadingPredictions ? (
        <CircularProgress sx={{ display: "block", mx: "auto", mt: 3 }} />
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center">Ticker</TableCell>
                <TableCell align="center">Predicted Price</TableCell>
                <TableCell align="center">Confidence Range</TableCell>
                <TableCell align="center">Prediction Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {predictions.map(([t, p, r, time]) => (
                <TableRow
                  key={t + time}
                  hover
                  onClick={() => handleRowClick(t)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell align="center">{t}</TableCell>
                  <TableCell align="center">{p}</TableCell>
                  <TableCell align="center">{r}</TableCell>
                  <TableCell align="center">{time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* --------- MOVERS -------- */}
      <Typography variant="h6" textAlign="center" mt={5}>
        Top 5 Gainers
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableBody>
            {gainers.map((s) => (
              <TableRow hover key={s.symbol} onClick={() => handleRowClick(s.symbol)}>
                <TableCell align="center">{s.symbol}</TableCell>
                <TableCell align="center">{s.name}</TableCell>
                <TableCell align="center">${s.price.toFixed(2)}</TableCell>
                <TableCell align="center" sx={{ color: "#2e7d32", fontWeight: 600 }}>
                  +{s.change.toFixed(2)} ({s.changesPercentage.toFixed(1)}%)
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" textAlign="center" mt={5}>
        Top 5 Losers
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 2, mb: 5 }}>
        <Table>
          <TableBody>
            {losers.map((s) => (
              <TableRow hover key={s.symbol} onClick={() => handleRowClick(s.symbol)}>
                <TableCell align="center">{s.symbol}</TableCell>
                <TableCell align="center">{s.name}</TableCell>
                <TableCell align="center">${s.price.toFixed(2)}</TableCell>
                <TableCell align="center" sx={{ color: "#c62828", fontWeight: 600 }}>
                  {s.change.toFixed(2)} ({s.changesPercentage.toFixed(1)}%)
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default Stock;