import React, { useState, useEffect } from "react";
import { Container, Grid, Box, Typography, CircularProgress, Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
import AlgorithmCard from "./components/AlgorithmCard";
import Pagination from "./components/Pagination";
import FilterBar from "./components/FilterBar";

export default function Marketplace() {
  const navigate = useNavigate();
  const [algorithms, setAlgorithms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ search: "", sortBy: "popular" });
  const [currentUser, setCurrentUser] = useState(null);
  const [sellerDialogOpen, setSellerDialogOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    version: "1.0.0",
  });
  const [createError, setCreateError] = useState("");

  const handleCreateSubmit = async () => {
    setCreateError("");
    try {
      const res = await api.post("/algorithms", {
        title: createForm.title,
        description: createForm.description,
        category: createForm.category,
        price: createForm.price ? parseFloat(createForm.price) : null,
        version: createForm.version,
      });
      setCreateModalOpen(false);
      setCreateForm({ title: "", description: "", category: "", price: "", version: "1.0.0" });
      navigate(`/marketplace/${res.data.id}`);
    } catch (err) {
      setCreateError(err.response?.data?.detail || "Failed to create listing.");
    }
  };

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
      <Box className="marketplace-header" sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700}>
          Algorithm Marketplace
        </Typography>
      </Box>

      <Box className="marketplace-controls" sx={{ }}>
        <FilterBar
          filters={filters}
          onChange={(partial) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, ...partial }));
          }}
          style={{ width: '100%' }}
        />
      </Box>

      {/* Create Listing button/modal below search bar */}
      {currentUser && (
        <Box sx={{ mb: 3 }}>
          {(currentUser.is_admin || currentUser.is_seller) ? (
            <>
              <Button
                variant="contained"
                sx={{ minWidth: 180, display: 'flex', alignItems: 'center', gap: 1 }}
                onClick={() => setCreateModalOpen(true)}
                startIcon={<AddIcon />}
              >
                Create Listing
              </Button>
              <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create Listing</DialogTitle>
                <DialogContent>
                  {/* CreateListing form logic inlined here */}
                  <Box sx={{ pt: 1 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                      Create New Algorithm Listing
                    </Typography>
                    {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
                    <TextField
                      fullWidth
                      label="Title"
                      value={createForm.title}
                      sx={{ mb: 2 }}
                      onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      label="Description"
                      multiline
                      rows={4}
                      sx={{ mb: 2 }}
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      select
                      label="Category"
                      sx={{ mb: 2 }}
                      value={createForm.category}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    >
                      <MenuItem value="Machine Learning">Machine Learning</MenuItem>
                      <MenuItem value="Scalping">Scalping</MenuItem>
                      <MenuItem value="Swing Trading">Swing Trading</MenuItem>
                      <MenuItem value="Crypto">Crypto</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </TextField>
                    <TextField
                      fullWidth
                      label="Price (optional)"
                      type="number"
                      sx={{ mb: 2 }}
                      value={createForm.price}
                      onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      label="Version"
                      value={createForm.version}
                      sx={{ mb: 3 }}
                      onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
                    />
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                  <Button variant="contained" onClick={handleCreateSubmit}>Create Listing</Button>
                </DialogActions>
              </Dialog>
            </>
          ) : (
            <Button
              variant="contained"
              sx={{ minWidth: 180 }}
              onClick={requestSellerAccess}
            >
              Become a Seller
            </Button>
          )}
          {currentUser.is_seller && !currentUser.seller_verified && (
            <Tooltip title="Your seller application is pending review by an admin.">
              <span>
                <Button variant="outlined" disabled sx={{ minWidth: 180 }}>
                  Pending Approval
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
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