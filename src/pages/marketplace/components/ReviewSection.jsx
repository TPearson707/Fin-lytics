import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Rating,
  TextField,
  Typography,
  Divider,
  Alert
} from "@mui/material";
import api from "../../../api";

export default function ReviewSection({ listingId, canReview }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    try {
      const res = await api.get(`/algorithms/${listingId}/reviews`);
      setReviews(res.data);
    } catch {
      setReviews([]);
    }
  }

  async function submitReview() {
    if (!rating) {
      setError("Please select a star rating before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await api.post("/algorithms/reviews", {
        listing_id: listingId,
        rating,
        comment
      });

      setComment("");
      setRating(0);
      loadReviews();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box mt={5}>
      <Typography variant="h5" fontWeight="600" sx={{ mb: 2 }}>
        Reviews
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {/* Review form (only if user can review) */}
      {canReview && (
        <Box sx={{ mb: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Rating
            size="large"
            value={rating}
            onChange={(e, val) => setRating(val)}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Write your thoughts..."
            sx={{ my: 2 }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <Button
            variant="contained"
            onClick={submitReview}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </Box>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Typography sx={{ mt: 2, color: "text.secondary" }}>
          No reviews yet.
        </Typography>
      ) : (
        reviews.map((r) => (
          <Box key={r.id} sx={{ my: 2 }}>
            <Rating value={r.rating} readOnly precision={0.5} />
            <Typography fontWeight={600}>{r.reviewer}</Typography>
            <Typography sx={{ mb: 1 }}>{r.comment || "(No comment)"}</Typography>
            <Divider />
          </Box>
        ))
      )}
    </Box>
  );
}
