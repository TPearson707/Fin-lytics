import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useDebounce } from "use-debounce";
import { useNavigate } from "react-router-dom";

export default function SearchBar({ placeholder = "Search Stocks..." }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_KEY = import.meta.env.VITE_FMP_API_KEY;
  const BASE_URL = "https://financialmodelingprep.com/api/v3/search";
  const CACHE_DURATION_MIN = 10;

  // Fetch + cache suggestions
  useEffect(() => {
    let active = true;

    async function fetchSuggestions() {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      const cacheKey = `search_${debouncedQuery.toLowerCase()}`;
      const cacheTimeKey = `${cacheKey}_time`;
      const cached = localStorage.getItem(cacheKey);
      const cachedTime = localStorage.getItem(cacheTimeKey);

      // Use cached results if younger than 10 min
      if (cached && cachedTime) {
        const age = (Date.now() - Number(cachedTime)) / 1000 / 60;
        if (age < CACHE_DURATION_MIN) {
          setSuggestions(JSON.parse(cached));
          return;
        }
      }

      try {
        setLoading(true);
        const res = await fetch(
          `${BASE_URL}?query=${debouncedQuery}&limit=10&apikey=${API_KEY}`
        );
        const data = await res.json();

        const results = data.map((d) => ({
          symbol: d.symbol,
          name: d.name,
          exchange: d.exchangeShortName,
        }));

        if (!active) return;
        setSuggestions(results);

        localStorage.setItem(cacheKey, JSON.stringify(results));
        localStorage.setItem(cacheTimeKey, String(Date.now()));
      } catch (e) {
        console.error("Search fetch failed", e);
      } finally {
        setLoading(false);
      }
    }

    fetchSuggestions();
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  const handleClick = (symbol) => {
    setQuery("");
    setSuggestions([]);
    navigate(`/stock/${symbol}`);
  };

  return (
    <Box position="relative" width="100%" maxWidth={500}>
      <TextField
        fullWidth
        label={placeholder}
        variant="outlined"
        size="small"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && suggestions[0]) {
            handleClick(suggestions[0].symbol);
          }
        }}
        InputProps={{
          endAdornment: loading ? (
            <CircularProgress size={16} sx={{ mr: 1 }} />
          ) : null,
        }}
      />

      {/* Dropdown suggestions */}
      {suggestions.length > 0 && (
        <Paper
          elevation={3}
          sx={{
            position: "absolute",
            width: "100%",
            mt: 1,
            zIndex: 10,
            maxHeight: 250,
            overflowY: "auto",
            borderRadius: 1,
          }}
        >
          {suggestions.map((s) => (
            <Box
              key={s.symbol}
              sx={{
                p: 1,
                cursor: "pointer",
                "&:hover": { backgroundColor: "#eef3ff" },
              }}
              onClick={() => handleClick(s.symbol)}
            >
              <Typography variant="body2">
                <strong>{s.symbol}</strong> — {s.name} ({s.exchange})
              </Typography>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}
