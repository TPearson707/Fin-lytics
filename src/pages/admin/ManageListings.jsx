import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Chip
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import api from "../../api";

export default function ManageListings() {
  const [listings, setListings] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  async function fetchListings() {
    setLoading(true);
    try {
      const res = await api.get("/admin/listings/all", {
        params: filter !== "all" ? { approval_status: filter } : undefined,
      });
      setListings(res.data);
    } catch (err) {
      toast.error("Failed to load listings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchListings();
  }, [filter]);

  const handleDelete = async () => {
    if (!selected) return;

    try {
      await api.delete(`/admin/listings/${selected.id}`);
      toast.success("Listing deleted ❌");
      setDeleteOpen(false);
      fetchListings();
    } catch {
      toast.error("Failed to delete listing");
    }
  };

  const toggleActive = async (row) => {
    try {
      await api.post(`/admin/listings/${row.id}/approve`, {
        approval_status: row.is_active ? "rejected" : "approved",
        rejection_reason: row.is_active ? "Disabled by admin" : null,
      });

      toast.success(row.is_active ? "Listing disabled" : "Listing reactivated");
      fetchListings();
    } catch {
      toast.error("Failed to update listing");
    }
  };

  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "title", headerName: "Title", flex: 1 },
    { field: "author_username", headerName: "Seller", width: 140 },
    { field: "category", headerName: "Category", width: 150 },
    { field: "price", headerName: "Price ($)", width: 100 },

    {
      field: "approval_status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => {
        const s = params.value;
        return (
          <Chip
            label={s.toUpperCase()}
            size="small"
            sx={{
              background:
                s === "approved"
                  ? "#16a34a33"
                  : s === "pending"
                  ? "#facc1533"
                  : "#ef444433",
              color:
                s === "approved"
                  ? "#15803d"
                  : s === "pending"
                  ? "#a16207"
                  : "#b91c1c",
            }}
          />
        );
      },
    },

    {
      field: "actions",
      headerName: "Actions",
      width: 260,
      renderCell: (params) => (
        <>
          <Button
            size="small"
            sx={{ mr: 1 }}
            variant="contained"
            onClick={() => {
              setPreviewItem(params.row);
              setPreviewOpen(true);
            }}
          >
            View
          </Button>

          <Button
            size="small"
            sx={{ mr: 1 }}
            variant={params.row.is_active ? "outlined" : "contained"}
            color={params.row.is_active ? "warning" : "success"}
            onClick={() => toggleActive(params.row)}
          >
            {params.row.is_active ? "Disable" : "Enable"}
          </Button>

          <Button
            size="small"
            color="error"
            variant="outlined"
            onClick={() => {
              setSelected(params.row);
              setDeleteOpen(true);
            }}
          >
            Delete
          </Button>
        </>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Manage Listings
      </Typography>

      {/* Filter Selector */}
      <Box sx={{ display: "flex", mb: 2, alignItems: "center" }}>
        <Typography sx={{ mr: 2 }}>Filter:</Typography>
        <Select
          size="small"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </Select>
      </Box>

      <div style={{ height: 550, width: "100%" }}>
        <DataGrid loading={loading} rows={listings} columns={columns} />
      </div>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Listing?</DialogTitle>
        <DialogContent>This action cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {previewItem?.title}
          <Typography variant="caption" sx={{ display: "block", opacity: 0.6 }}>
            Listing #{previewItem?.id}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Typography sx={{ mb: 1 }}><strong>Category:</strong> {previewItem?.category}</Typography>
          <Typography sx={{ mb: 1 }}><strong>Price:</strong> ${previewItem?.price}</Typography>
          <Typography sx={{ mb: 1 }}><strong>Seller:</strong> {previewItem?.author_username}</Typography>
          <Typography sx={{ mt: 2 }}>
            <strong>Description:</strong>
            <br />
            {previewItem?.description || "No description provided"}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => window.open(`/marketplace/${previewItem.id}`, "_blank")}
          >
            Open Public Page
          </Button>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
