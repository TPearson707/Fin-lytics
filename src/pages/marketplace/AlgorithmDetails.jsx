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
  Rating,
  TextField,
  Paper,
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

  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 0, comment: "" });
  const [reviewError, setReviewError] = useState("");

  // ---------------- FETCH DATA ----------------
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
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await api.get("/auth/me");
      setCurrentUser(res.data);
    } catch {}
  };

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/algorithms/${id}/reviews`);
      setReviews(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchMe();
    fetchAlgo();
    fetchReviews();
  }, [id]);

  // ---------------- PURCHASE ----------------
  const handlePurchase = async () => {
    try {
      const res = await api.post("/algorithms/purchase", { listing_id: Number(id) });

      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        alert("Algorithm added to your library.");
        fetchAlgo();
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Purchase failed.");
    }
  };

  // ---------------- DOWNLOAD ----------------
  const handleDownload = async () => {
    try {
      const response = await api.get(`/algorithms/${id}/download`, {
        responseType: "blob",
      });

      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = algo.file_name || `algorithm_${id}`;
      link.click();
    } catch {
      alert("Failed to download.");
    }
  };

  // ---------------- SUBMIT REVIEW ----------------
  const submitReview = async () => {
    if (newReview.rating === 0)
      return setReviewError("Rating is required.");

    try {
      const res = await api.post("/algorithms/reviews", {
        listing_id: Number(id),
        rating: newReview.rating,
        comment: newReview.comment,
      });

      // ⭐ FIXED: Update UI immediately using backend response key
      setAlgo(prev => ({
        ...prev,
        rating: res.data.updated_rating,    // <-- PATCHED
        num_reviews: (prev.num_reviews ?? 0) + 1
      }));

      setNewReview({ rating: 0, comment: "" });
      setReviewError("");

      fetchReviews();

    } catch (err) {
      setReviewError(err.response?.data?.detail || "Failed to submit review.");
    }
  };

  // ---------------- CONDITIONALS ----------------
  if (loading)
    return <CircularProgress sx={{ mt: 6, mx: "auto", display: "block" }} />;

  if (!algo)
    return (
      <Alert severity="error" sx={{ mt: 5, maxWidth: 600, mx: "auto" }}>
        Algorithm not found.
      </Alert>
    );

  const isOwner = currentUser && currentUser.id === algo.user_id;
  const priceLabel = algo.price ? `$${algo.price.toFixed(2)}` : "Free";

  return (
    <Box maxWidth="900px" mx="auto" mt={5}>
      {/* ------------ HEADER ------------ */}
      <Typography variant="h4" fontWeight={700}>{algo.title}</Typography>
      <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
        by {algo.author_username}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ my: 2 }}>
        <Rating value={algo.rating || 0} precision={0.5} readOnly />
        <Typography color="text.secondary">({reviews.length} reviews)</Typography>
      </Stack>

      {/* ------------ TAGS ------------ */}
      {algo.category && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {algo.category.split(",").map((tag, i) => (
            <Chip key={i} label={tag.trim()} size="small" />
          ))}
        </Stack>
      )}

      {/* ------------ PRICE ------------ */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Price: {priceLabel}
      </Typography>

      <Typography sx={{ mb: 3 }}>{algo.description}</Typography>

      <Divider sx={{ my: 3 }} />

      {/* ------------ ACTIONS ------------ */}
      <Stack direction="row" spacing={2}>
        {isOwner && (
          <Button variant="contained" onClick={() => setShowUploadModal(true)}>
            Upload File
          </Button>
        )}

        {algo.has_purchased || isOwner ? (
          <Button variant="outlined" onClick={handleDownload}>Download</Button>
        ) : algo.price > 0 ? (
          <Button variant="contained" color="success" onClick={handlePurchase}>
            Buy Now
          </Button>
        ) : (
          <Button variant="outlined" onClick={handleDownload}>Download Free</Button>
        )}

        {isOwner && (
          <Button variant="text" color="error" onClick={() => navigate(`/marketplace/edit/${id}`)}>
            Edit Listing
          </Button>
        )}
        {isOwner && (
        <Button
          variant="outlined"
          color="error"
          onClick={async () => {
            if (!window.confirm("Are you sure? This cannot be undone.")) return;

            try {
              await api.delete(`/algorithms/${id}`);
              alert("Listing deleted.");
              navigate("/marketplace");
            } catch (err) {
              alert(err.response?.data?.detail || "Failed to delete.");
            }
          }}
        >
          Delete Listing
        </Button>
      )}
      </Stack>

      {/* ------------ REVIEWS ------------ */}
      <Divider sx={{ my: 4 }} />
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Reviews</Typography>

      {algo.has_purchased && !isOwner && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Write a Review</Typography>

          <Rating
            value={newReview.rating}
            onChange={(e, val) => setNewReview({ ...newReview, rating: val })}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Share your thoughts..."
            sx={{ mt: 2 }}
            value={newReview.comment}
            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
          />

          {reviewError && <Alert severity="error" sx={{ mt: 1 }}>{reviewError}</Alert>}

          <Button sx={{ mt: 2 }} variant="contained" onClick={submitReview}>
            Submit Review
          </Button>
        </Paper>
      )}

      {/* LIST REVIEW CARDS */}
      {reviews.map((r) => (
        <Paper key={r.id} sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Rating value={r.rating} readOnly size="small" precision={0.5} />
            {/* ⭐ FIXED: Correct reviewer field */}
            <Typography variant="subtitle2">{r.reviewer_username}</Typography>
          </Stack>
          <Typography sx={{ mt: 1 }}>{r.comment || "No comment"}</Typography>
        </Paper>
      ))}

      {/* ------------ MODAL ------------ */}
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
