import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import api from "../../api";

export default function ManageSellers() {
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function fetchSellers() {
    try {
      const res = await api.get("/admin/sellers");
      setSellers(res.data);
      setFiltered(res.data);
    } catch {
      toast.error("Failed to fetch sellers");
    }
  }

  useEffect(() => {
    fetchSellers();
  }, []);

  // 🔍 Search filter
  useEffect(() => {
    setFiltered(
      sellers.filter((u) =>
        `${u?.username ?? ""} ${u?.email ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    );
  }, [search, sellers]);

  async function toggleVerify() {
    if (!selectedUser) return;

    try {
      await api.post(`/admin/sellers/${selectedUser.id}/verify`, {
        verified: !selectedUser.seller_verified,
      });

      toast.success(
        selectedUser.seller_verified
          ? "Seller access revoked 🚫"
          : "Seller verified 🎉"
      );

      setConfirmOpen(false);
      setSelectedUser(null);
      fetchSellers();
    } catch {
      toast.error("Failed to update seller status");
    }
  }

  const columns = [
    { field: "id", headerName: "User ID", width: 90 },
    { field: "username", headerName: "Username", width: 160 },
    { field: "email", headerName: "Email", flex: 1 },

    {
      field: "seller_verified",
      headerName: "Status",
      width: 140,
      renderCell: (params) => {
        const value = Boolean(params.value);
        return value ? (
          <Chip label="Verified" color="success" size="small" />
        ) : (
          <Chip label="Pending" color="warning" size="small" />
        );
      },
    },

    {
      field: "is_admin",
      headerName: "Role",
      width: 120,
      renderCell: (params) => {
        const value = Boolean(params.value);
        return (
          <Chip
            label={value ? "Admin" : "User"}
            color={value ? "primary" : "default"}
            size="small"
          />
        );
      },
    },

    {
      field: "actions",
      headerName: "Actions",
      width: 220,
      renderCell: (params) => (
        <Button
          variant="contained"
          size="small"
          onClick={() => {
            setSelectedUser(params.row);
            setConfirmOpen(true);
          }}
        >
          {params.row.seller_verified ? "Revoke Access" : "Verify Seller"}
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Manage Sellers
      </Typography>

      <TextField
        placeholder="Search seller..."
        fullWidth
        variant="outlined"
        sx={{ mb: 2 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Box sx={{ height: 550, width: "100%" }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={(row) => row.id}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Confirm Modal */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Action</DialogTitle>

        <DialogContent>
          {selectedUser && (
            selectedUser.seller_verified
              ? `Remove seller privileges from ${selectedUser.username}?`
              : `Approve seller access for ${selectedUser.username}?`
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={toggleVerify}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
