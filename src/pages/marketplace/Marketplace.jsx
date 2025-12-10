import React, { useState, useEffect } from "react";
import { Container, Grid, Box, Typography, CircularProgress, Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
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
  const [currentUser, setCurrentUser] = useState(null);
  const [sellerDialogOpen, setSellerDialogOpen] = useState(false);

  useEffect(() => {
    fetchMe();
    fetchAlgorithms(page, filters);
  }, [page, filters]);

  async function fetchMe() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await api.get("/auth/me");
      setCurrentUser(res.data);
    } catch (err) {
      console.error("Failed to load user:", err);
    }
  }

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

  async function requestSellerAccess() {
    try {
      await api.post("/algorithms/seller/request");
      toast.success("Seller request submitted!");

      setSellerDialogOpen(true);
      fetchMe();
    } catch (err) {
      toast.error("Failed to request seller access.");
      console.error(err);
    }
  }

  const canCreate = currentUser?.is_admin || (currentUser?.is_seller && currentUser?.seller_verified);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" fontWeight={700}>
          Algorithm Marketplace
        </Typography>
      </Box>

      <FilterBar
        filters={filters}
        onChange={(partial) => {
          setPage(1);
          setFilters((prev) => ({ ...prev, ...partial }));
        }}
      />

      {/* ---- Conditional Button Logic ---- */}
      {currentUser && (
        <>
          {/* Create Listing is available for ALL sellers (pending or verified) + admins */}
          {(currentUser.is_admin || currentUser.is_seller) ? (
            <Button
              variant="contained"
              sx={{ mt: 2, mr: 2 }}
              onClick={() => navigate("/marketplace/create")}
            >
              Create Listing
            </Button>
          ) : (
            <Button
              variant="contained"
              sx={{ mt: 2, mr: 2 }}
              onClick={requestSellerAccess}
            >
              Become a Seller
            </Button>
          )}

          {/* Show pending status ONLY if seller exists but is not yet verified */}
          {currentUser.is_seller && !currentUser.seller_verified && (
            <Tooltip title="Your seller application is pending review by an admin.">
              <span>
                <Button variant="outlined" disabled sx={{ mt: 2 }}>
                  Pending Approval
                </Button>
              </span>
            </Tooltip>
          )}
        </>
      )}


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

      {/* Seller Request Confirmation Dialog */}
      <Dialog open={sellerDialogOpen} onClose={() => setSellerDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Seller Access Requested</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          You're now flagged as a seller.  
          <br /><br />
          You can begin setting up listings, but they won’t become visible until an admin reviews and approves your seller profile.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSellerDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
