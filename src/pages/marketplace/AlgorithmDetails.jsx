import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Chip,
  Alert,
  Divider,
} from "@mui/material";
import api from "../../api";
import UploadFileModal from "./components/modals/UploadFileModal";

export default function AlgorithmDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [algo, setAlgo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchAlgo = async () => {
    try {
      const res = await api.get(`/algorithms/${id}`);
      setAlgo(res.data);
    } catch {
      setAlgo(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMe = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await api.get("/auth/me");
      setCurrentUser(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchMe();
    fetchAlgo();
  }, [id]);

  const handleDownload = async () => {
    try {
      const response = await api.get(`/algorithms/${id}/download`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        algo?.file_name || `algorithm_${id}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download file.");
    }
  };

  if (loading)
    return <CircularProgress sx={{ mt: 6, mx: "auto", display: "block" }} />;

  if (!algo)
    return (
      <Alert severity="error" sx={{ mt: 5, maxWidth: 600, mx: "auto" }}>
        Algorithm not found.
      </Alert>
    );

  const isOwner = currentUser && currentUser.id === algo.user_id;
  const hasFile = Boolean(algo.file_name);
  const priceLabel =
    algo.price === null || algo.price === 0
      ? "Free"
      : `$${Number(algo.price).toFixed(2)}`;

  return (
    <Box maxWidth="900px" mx="auto" mt={5}>

      <Typography variant="h4" fontWeight={700}>{algo.title}</Typography>
      <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 2 }}>
        by {algo.author_username}
      </Typography>

      {algo.category && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {algo.category.split(",").map((tag, i) => (
            <Chip key={i} label={tag.trim()} size="small" />
          ))}
        </Stack>
      )}

      {/* PRICE */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Price: {priceLabel}
      </Typography>

      <Typography sx={{ mb: 3, lineHeight: 1.6 }}>
        {algo.description || "No description provided."}
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* ACTIONS */}
      <Stack direction="row" spacing={2}>

        {isOwner && (
          <Button variant="contained" onClick={() => setShowUploadModal(true)}>
            Upload File
          </Button>
        )}

        {hasFile ? (
          <Button variant="outlined" onClick={handleDownload}>
            {priceLabel === "Free" ? "Download" : "Purchase to Download"}
          </Button>
        ) : (
          !isOwner && (
            <Typography sx={{ color: "text.secondary" }}>
              No downloadable file available yet.
            </Typography>
          )
        )}

        {isOwner && (
          <Button
            variant="text"
            color="error"
            onClick={() => navigate(`/marketplace/edit/${id}`)}
          >
            Edit Listing
          </Button>
        )}
      </Stack>

      {/* MODAL */}
      <UploadFileModal
        listingId={id}
        open={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          fetchAlgo();
        }}
      />
    </Box>
  );
}
