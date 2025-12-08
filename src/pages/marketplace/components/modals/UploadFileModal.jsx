import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from "@mui/material";
import api from "../../../../api";

export default function UploadFileModal({ open, onClose, listingId }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload() {
    if (!file) return;

    try {
      setLoading(true);
      setMessage("");

      const formData = new FormData();
      formData.append("file", file);

      await api.post(`/algorithms/${listingId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("Upload successful!");
      setTimeout(onClose, 1200);
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Algorithm File</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          Choose the compiled `.py`, `.js`, `.zip`, or executable file for users to download.
        </Typography>

        {message && (
          <Alert severity={message.includes("successful") ? "success" : "error"}>
            {message}
          </Alert>
        )}

        <Box mt={2}>
          <input
            type="file"
            onChange={e => setFile(e.target.files[0])}
            style={{ width: "100%" }}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button disabled={!file || loading} variant="contained" onClick={handleUpload}>
          {loading ? "Uploading..." : "Upload"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
