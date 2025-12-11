import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  TextField,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../../api";
import toast from "react-hot-toast";

export default function PendingApprovals() {
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchPending() {
    try {
      const res = await api.get("/admin/listings/pending");
      setListings(res.data);
    } catch {
      toast.error("Failed to fetch pending listings");
    }
  }

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async () => {
    if (!selectedListing) return;

    setLoading(true);

    try {
      await api.post(`/admin/listings/${selectedListing.id}/approve`, {
        approval_status: actionType === "approve" ? "approved" : "rejected",
        rejection_reason: actionType === "reject" ? rejectReason : null,
      });

      toast.success(
        actionType === "approve"
          ? "Listing Approved"
          : "Listing Rejected"
      );

      setActionOpen(false);
      setRejectReason("");
      setSelectedListing(null);
      fetchPending(); // refresh
    } catch (error) {
      toast.error("Action failed");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "title", headerName: "Title", flex: 1 },
    { field: "author_username", headerName: "Seller", width: 140 },
    { field: "category", headerName: "Category", width: 150 },
    { field: "price", headerName: "Price ($)", width: 110 },
    {
      field: "actions",
      headerName: "Actions",
      width: 210,
      renderCell: (params) => (
        <>
          <Button
            variant="contained"
            size="small"
            sx={{ mr: 1 }}
            onClick={() => {
              setSelectedListing(params.row);
              setActionType("approve");
              setActionOpen(true);
            }}
          >
            Approve
          </Button>

          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => {
              setSelectedListing(params.row);
              setActionType("reject");
              setActionOpen(true);
            }}
          >
            Reject
          </Button>
        </>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Pending Approvals
      </Typography>

      <div style={{ height: 500, width: "100%" }}>
        <DataGrid rows={listings} columns={columns} pageSize={10} />
      </div>

      {/* Action Modal */}
      <Dialog open={actionOpen} onClose={() => !loading && setActionOpen(false)}>
        <DialogTitle>
          {actionType === "approve"
            ? `Approve: ${selectedListing?.title}`
            : `Reject: ${selectedListing?.title}`}
        </DialogTitle>

        <DialogContent>
          {actionType === "reject" && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Rejection Reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>

        <DialogActions>
          <Button
            disabled={loading}
            onClick={() => setActionOpen(false)}
          >
            Cancel
          </Button>

          <Button
            disabled={loading}
            variant="contained"
            color={actionType === "approve" ? "success" : "error"}
            onClick={handleAction}
          >
            {loading ? "Processing..." : actionType === "approve" ? "Approve" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
