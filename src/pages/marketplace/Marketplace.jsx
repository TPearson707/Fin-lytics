import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";

import api from "../../api";
import AlgorithmCard from "./components/AlgorithmCard";
import Pagination from "./components/Pagination";
import FilterBar from "./components/FilterBar"; // you can comment this out if not using
import "./Marketplace.scss";

export default function Marketplace() {
  const [algorithms, setAlgorithms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    sortBy: "popular",
  });

  useEffect(() => {
    fetchAlgorithms(page, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

//   async function fetchAlgorithms(pageNumber, currentFilters) {
//     try {
//       setLoading(true);

//       const token = localStorage.getItem("token");

//       const res = await api.get("/algorithms/marketplace", {
//         params: {
//           page: pageNumber,
//           limit: 9,
//           search: currentFilters.search || undefined,
//           sort_by: currentFilters.sortBy || undefined,
//         },
//         headers: {
//           Authorization: token ? `Bearer ${token}` : undefined,
//         },
//       });

//       // Expected response shape:
//       // {
//       //   items: [ { id, name, description, creator, tags, price, rating, updated_at }, ... ],
//       //   total_pages: number
//       // }

//       const data = res.data;
//       setAlgorithms(data.items || []);
//       setTotalPages(data.total_pages || 1);
//     } catch (err) {
//       console.error("Error loading algorithms:", err);
//       setAlgorithms([]);
//       setTotalPages(1);
//     } finally {
//       setLoading(false);
//     }
//   }

  async function fetchAlgorithms(pageNumber, currentFilters) {
    try {
        setLoading(true);

        // Fake network delay
        await new Promise((r) => setTimeout(r, 300));

        // Dummy data
        const dummyItems = [
        {
            id: 1,
            name: "Momentum Strategy",
            description: "Uses price action and moving averages to detect momentum shifts.",
            creator: "Alice",
            tags: ["momentum", "trend", "SMA"],
            price: 0,
            rating: 4.5,
            num_reviews: 12,
            updated_at: "2024-10-04",
        },
        {
            id: 2,
            name: "Mean Reversion",
            description: "Statistical arbitrage model based on z-score reversion.",
            creator: "Bob",
            tags: ["mean reversion", "z-score"],
            price: 9.99,
            rating: 4.1,
            num_reviews: 8,
            updated_at: "2024-11-10",
        },
        {
            id: 3,
            name: "ML Price Predictor",
            description: "Gradient-boosted model trained on OHLC + macro data.",
            creator: "Chris",
            tags: ["machine learning", "gbm", "prediction"],
            price: 14.99,
            rating: 5.0,
            num_reviews: 22,
            updated_at: "2025-01-15",
        }
        ];

        setAlgorithms(dummyItems);
        setTotalPages(1);
    } catch (err) {
        console.error("Dummy load error:", err);
        setAlgorithms([]);
        setTotalPages(1);
    } finally {
        setLoading(false);
    }
    }


  const handlePageChange = (newPage) => {
    if (newPage === page) return;
    setPage(newPage);
  };

  const handleFiltersChange = (partial) => {
    setPage(1); // reset to first page when filters change
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Algorithm Marketplace
      </Typography>

      <Typography
        variant="body2"
        sx={{ mb: 2, color: "text.secondary", maxWidth: 700 }}
      >
        Discover and subscribe to trading algorithms created by the FinLytics
        community. Browse, filter, and drill into details for each model.
      </Typography>

      <FilterBar filters={filters} onChange={handleFiltersChange} />

      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : algorithms.length === 0 ? (
        <Box textAlign="center" mt={5}>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            No algorithms found. Try adjusting your filters or check back later.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {algorithms.map((algo) => (
            <Grid key={algo.id} item xs={12} sm={6} md={4}>
              <AlgorithmCard algo={algo} />
            </Grid>
          ))}
        </Grid>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </Container>
  );
}
