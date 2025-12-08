import React, { useState, useEffect } from "react";
import { Container, Grid, Box, Typography, CircularProgress, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import AlgorithmCard from "./components/AlgorithmCard";
import Pagination from "./components/Pagination";
import FilterBar from "./components/FilterBar";
import "./Marketplace.scss";

export default function Marketplace() {
  const navigate = useNavigate();
  const [algorithms, setAlgorithms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ search: "", sortBy: "popular" });

  useEffect(() => {
    fetchAlgorithms(page, filters);
  }, [page, filters]);

  async function fetchAlgorithms(pageNumber, currentFilters) {
    try {
      setLoading(true);

      const res = await api.get("/algorithms/marketplace", {
        params: {
          page: pageNumber,
          limit: 9,
          search: currentFilters.search || undefined,
          sort_by: currentFilters.sortBy || undefined,
        },
      });

      setAlgorithms(res.data.items || []);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      console.error("Error loading algorithms:", err);
      setAlgorithms([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" fontWeight={700}>
          Algorithm Marketplace
        </Typography>

        <Button variant="contained" onClick={() => navigate("/marketplace/create")}>
          Create Listing
        </Button>
      </Box>

      <FilterBar
        filters={filters}
        onChange={(partial) => {
          setPage(1);
          setFilters((prev) => ({ ...prev, ...partial }));
        }}
      />

      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : algorithms.length === 0 ? (
        <Typography textAlign="center" sx={{ mt: 4, color: "text.secondary" }}>
          No algorithms found.
        </Typography>
      ) : (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {algorithms.map((algo) => (
            <Grid key={algo.id} item xs={12} sm={6} md={4}>
              <AlgorithmCard algo={algo} />
            </Grid>
          ))}
        </Grid>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Container>
  );
}
