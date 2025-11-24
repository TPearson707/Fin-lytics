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
  // ---- State variables ----
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  const [loadingMovers, setLoadingMovers] = useState(true);
  const [error, setError] = useState(null);
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [usedHistorical, setUsedHistorical] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  async function fetchMovingAverages(ticker) {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `http://127.0.0.1:8000/stocks/indicators/all/${ticker}?timeframe=daily`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) return "SMA20: - | EMA20: -";

      const data = await res.json();
      const indicators = data.indicators || {};

      const sma = indicators.sma?.slice(-1)[0]?.sma;
      const ema = indicators.ema?.slice(-1)[0]?.ema;

      return `SMA20: ${sma?.toFixed(2) ?? "-"} | EMA20: ${ema?.toFixed(2) ?? "-"}`;
    } catch (err) {
      console.error("MA fetch error:", err);
      return "SMA20: - | EMA20: -";
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

      const formatted = await Promise.all(
        data.predictions.map(async (p) => {
          const confidenceRange =
            p.confidence_low && p.confidence_high
              ? `$${p.confidence_low.toFixed(2)} – $${p.confidence_high.toFixed(2)}`
              : "—";

          const maText = await fetchMovingAverages(p.ticker);

          return [
            p.ticker,
            `$${p.predicted_price?.toFixed(2)}`,
            `${confidenceRange}\n${maText}`,
            new Date(p.prediction_time ?? Date.now()).toLocaleString(),
          ];
        })
      );



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

    /** Check subscription status on mount */
    useEffect(() => {
        checkSubscriptionStatus();
    }, []);

    /** Auto-refresh Chronos predictions every 5 min (only if subscribed) */
    useEffect(() => {
        if (hasSubscription) {
            fetchChronosPredictions();
            const predInt = setInterval(() => fetchChronosPredictions(true), 5 * 60 * 1000);
            return () => clearInterval(predInt);
        }
    }, [hasSubscription]);

    /** Auto-refresh market movers every 5 min */
    useEffect(() => {
        fetchMarketMovers();
        const movInt = setInterval(() => fetchMarketMovers(true), 5 * 60 * 1000);
        return () => clearInterval(movInt);
    }, []);

  const handleRowClick = (ticker) => navigate(`${ticker}`);

  /** Check subscription status */
  async function checkSubscriptionStatus() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setCheckingSubscription(false);
        return;
      }

      // Check if user just completed checkout - verify session first
      const sessionId = searchParams.get("session_id");
      if (sessionId) {
        try {
          // Verify the checkout session and update subscription status
          const verifyResponse = await api.post(
            "/stripe/verify-session",
            { session_id: sessionId },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (verifyResponse.data.success) {
            console.log("Subscription verified and activated:", verifyResponse.data.message);
            // Remove session_id from URL
            window.history.replaceState({}, "", "/stock");
          } else {
            console.warn("Session verification returned:", verifyResponse.data.message);
          }
        } catch (verifyErr) {
          console.error("Error verifying session:", verifyErr);
          // Continue to check subscription status even if verification fails
        }
      }

      // Check current subscription status
      const response = await api.get("/stripe/subscription/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setHasSubscription(response.data.has_subscription);
    } catch (err) {
      console.error("Error checking subscription status:", err);
      // If error, assume no subscription to show paywall
      setHasSubscription(false);
    } finally {
      setCheckingSubscription(false);
    }
  }

  const handleSubscribeSuccess = () => {
    setHasSubscription(true);
    // Reload predictions once subscription is active
    fetchChronosPredictions(true);
  };

  // Show paywall if checking subscription or if no subscription
  if (checkingSubscription) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!hasSubscription) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
          Stock Predictions Dashboard
        </Typography>
        <Box display="flex" justifyContent="center" mb={3}>
          <SearchBar placeholder="Search or jump to stock..." />
        </Box>
        <Paywall onSubscribeSuccess={handleSubscribeSuccess} />
      </Container>
    );
  }

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
                    <TableCell align="center" sx={{ whiteSpace: "pre-line" }}>{range}</TableCell>
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
