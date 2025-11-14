import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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

function Stock() {
  // ---- State variables ----
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  const [loadingMovers, setLoadingMovers] = useState(true);
  const [error, setError] = useState(null);
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [usedHistorical, setUsedHistorical] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();
  const companyCache = useRef({});

  /** Fetch top gainers and losers */
  async function fetchMarketMovers(forceRefresh = false) {
    try {
      const cachedGainers = localStorage.getItem("cachedGainers");
      const cachedLosers = localStorage.getItem("cachedLosers");
      const cachedTime = localStorage.getItem("cachedMoversTime");

      // Check cache validity (5 min)
      const cacheIsValid =
        !forceRefresh &&
        cachedGainers &&
        cachedLosers &&
        cachedTime &&
        (Date.now() - Number(cachedTime)) / 1000 / 60 < 5;

      if (cacheIsValid) {
        setGainers(JSON.parse(cachedGainers));
        setLosers(JSON.parse(cachedLosers));
        setUsedHistorical(false);
        setLastUpdated(new Date(Number(cachedTime)));
        return;
      }

      setLoadingMovers(true);

      const [gRes, lRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/stocks/gainers", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch("http://127.0.0.1:8000/stocks/losers", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      if (!gRes.ok || !lRes.ok) throw new Error("Failed to fetch market movers");

      const [gainersData, losersData] = await Promise.all([
        gRes.json(),
        lRes.json(),
      ]);

      setGainers(gainersData);
      setLosers(losersData);
      setUsedHistorical(false);
      setLastUpdated(new Date());
      localStorage.setItem("cachedGainers", JSON.stringify(gainersData));
      localStorage.setItem("cachedLosers", JSON.stringify(losersData));
      localStorage.setItem("cachedMoversTime", String(Date.now()));
    } catch (err) {
      console.error("Market movers fetch error:", err);
      setError(err.message);

      const cachedGainers = localStorage.getItem("cachedGainers");
      const cachedLosers = localStorage.getItem("cachedLosers");
      if (cachedGainers && cachedLosers) {
        setGainers(JSON.parse(cachedGainers));
        setLosers(JSON.parse(cachedLosers));
        setUsedHistorical(false);
      }
    } finally {
      setLoadingMovers(false);
    }
  }

  /** Fetch Chronos predictions */
  async function fetchChronosPredictions(forceRefresh = false) {
    try {
      setLoadingPredictions(true);

      const cached = localStorage.getItem("chronosPredictions");
      const cachedTime = localStorage.getItem("chronosPredictionsTime");

      const cacheIsValid =
        !forceRefresh &&
        cached &&
        cachedTime &&
        (Date.now() - Number(cachedTime)) / 1000 / 60 < 5;

      if (cacheIsValid) {
        setPredictions(JSON.parse(cached));
        setLastUpdated(new Date(Number(cachedTime)));
        return;
      }

      const res = await fetch("http://127.0.0.1:8000/stocks/predictions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          tickers: ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "BRK.B", "TSLA"],
        }),
      });

      if (!res.ok) throw new Error("Prediction fetch failed");

      const data = await res.json();

      const formatted = data.predictions.map((p) => [
        p.ticker,
        `$${p.predicted_price?.toFixed(2)}`,
        p.confidence_low && p.confidence_high
          ? `$${p.confidence_low?.toFixed(2)} – $${p.confidence_high?.toFixed(2)}`
          : "—",
        new Date(p.prediction_time ?? Date.now()).toLocaleString(),
      ]);

      setPredictions(formatted);
      setLastUpdated(new Date());
      localStorage.setItem("chronosPredictions", JSON.stringify(formatted));
      localStorage.setItem("chronosPredictionsTime", String(Date.now()));
    } catch (err) {
      console.error("Prediction fetch error:", err);
      setError(err.message);

      const cached = localStorage.getItem("chronosPredictions");
      if (cached) {
        setPredictions(JSON.parse(cached));
        setLastUpdated(
          new Date(Number(localStorage.getItem("chronosPredictionsTime") ?? Date.now()))
        );
      }
    } finally {
      setLoadingPredictions(false);
    }
  }

    /** Auto-refresh Chronos predictions every 5 min */
    useEffect(() => {
        fetchChronosPredictions();
        const predInt = setInterval(() => fetchChronosPredictions(true), 5 * 60 * 1000);
        return () => clearInterval(predInt);
    }, []);

    /** Auto-refresh market movers every 5 min */
    useEffect(() => {
        fetchMarketMovers();
        const movInt = setInterval(() => fetchMarketMovers(true), 5 * 60 * 1000);
        return () => clearInterval(movInt);
    }, []);

  const handleRowClick = (ticker) => navigate(`${ticker}`);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
        Stock Predictions Dashboard
      </Typography>

      <Box display="flex" justifyContent="center" mb={3}>
        <SearchBar placeholder="Search or jump to stock..." />
      </Box>

      {error && (
        <Typography color="error" align="center">
          {error}
        </Typography>
      )}

      {/* --- Chronos Predictions --- */}
      <Typography variant="h6" textAlign="center" mt={4}>
        Chronos Predictions (Auto-Refreshed)
      </Typography>

      {lastUpdated && (
        <Typography
          variant="body2"
          align="center"
          sx={{ color: "#666", fontStyle: "italic", mt: 0.5 }}
        >
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Typography>
      )}

      {loadingPredictions ? (
        <Box display="flex" justifyContent="center" mt={3}>
          <CircularProgress />
        </Box>
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
              {predictions.length > 0 ? (
                predictions.map(([ticker, price, range, time]) => (
                  <TableRow
                    key={ticker}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => handleRowClick(ticker)}
                  >
                    <TableCell align="center">{ticker}</TableCell>
                    <TableCell align="center">{price}</TableCell>
                    <TableCell align="center">{range}</TableCell>
                    <TableCell align="center">{time}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell align="center" colSpan={4}>
                    <Typography sx={{ color: "#777", py: 2 }}>
                      No Chronos predictions available right now.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* --- Gainers --- */}
      <Typography variant="h6" textAlign="center" mt={5}>
        Top 5 Gainers ({usedHistorical ? "Last Market Day" : "Today"})
      </Typography>

      {loadingMovers ? (
        <Box display="flex" justifyContent="center" mt={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center">Ticker</TableCell>
                <TableCell align="center">Company</TableCell>
                <TableCell align="center">Price</TableCell>
                <TableCell align="center">Change ($)</TableCell>
                <TableCell align="center">Change (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gainers.map((s) => (
                <TableRow
                  key={s.symbol}
                  hover
                  onClick={() => handleRowClick(s.symbol)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell align="center">{s.symbol}</TableCell>
                  <TableCell align="center">{s.name}</TableCell>
                  <TableCell align="center">${s.price?.toFixed(2)}</TableCell>
                  <TableCell
                    align="center"
                    sx={{ color: s.change >= 0 ? "#2e7d32" : "#c62828", fontWeight: 600 }}
                  >
                    {s.change > 0 ? `+${s.change.toFixed(2)}` : s.change.toFixed(2)}
                  </TableCell>
                  <TableCell align="center" sx={{ color: "#2e7d32", fontWeight: 600 }}>
                    {s.change?.toFixed(1) ?? s.changesPercentage?.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* --- Losers --- */}
      <Typography variant="h6" textAlign="center" mt={5}>
        Top 5 Losers ({usedHistorical ? "Last Market Day" : "Today"})
      </Typography>

      {loadingMovers ? (
        <Box display="flex" justifyContent="center" mt={3} mb={5}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2, mb: 5 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center">Ticker</TableCell>
                <TableCell align="center">Company</TableCell>
                <TableCell align="center">Price</TableCell>
                <TableCell align="center">Change ($)</TableCell>
                <TableCell align="center">Change (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {losers.map((s) => (
                <TableRow
                  key={s.symbol}
                  hover
                  onClick={() => handleRowClick(s.symbol)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell align="center">{s.symbol}</TableCell>
                  <TableCell align="center">{s.name}</TableCell>
                  <TableCell align="center">${s.price?.toFixed(2)}</TableCell>
                  <TableCell
                    align="center"
                    sx={{ color: s.change >= 0 ? "#2e7d32" : "#c62828", fontWeight: 600 }}
                  >
                    {s.change > 0 ? `+${s.change.toFixed(2)}` : s.change.toFixed(2)}
                  </TableCell>
                  <TableCell align="center" sx={{ color: "#c62828", fontWeight: 600 }}>
                    {s.change?.toFixed(1) ?? s.changesPercentage?.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {usedHistorical && (
        <Typography
          variant="body2"
          align="center"
          sx={{ color: "#666", mb: 3, fontStyle: "italic" }}
        >
          Showing results from the last trading day because markets are closed.
        </Typography>
      )}
    </Container>
  );
}

export default Stock;
