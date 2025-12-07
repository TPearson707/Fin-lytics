import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Button,
  Stack,
  Rating,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function AlgorithmCard({ algo }) {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    // adjust route to whatever detail view you end up using
    navigate(`/marketplace/${algo.id}`);
  };

  return (
    <Card sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 0.5 }}>
          {algo.creator || "Unknown Creator"}
        </Typography>

        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
          {algo.name}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mb: 1.5,
            color: "text.secondary",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {algo.description || "No description provided."}
        </Typography>

        {algo.tags && algo.tags.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 1.5 }}>
            {algo.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} label={tag} size="small" />
            ))}
            {algo.tags.length > 3 && (
              <Chip
                label={`+${algo.tags.length - 3}`}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        )}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mt: 1,
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {algo.price === 0 || algo.price === "0"
                ? "Free"
                : `$${Number(algo.price).toFixed(2)} / month`}
            </Typography>
            {algo.updated_at && (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Updated: {new Date(algo.updated_at).toLocaleDateString()}
              </Typography>
            )}
          </Box>

          <Box textAlign="right">
            <Rating
              value={Number(algo.rating) || 0}
              precision={0.5}
              readOnly
              size="small"
            />
            {algo.num_reviews != null && (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {algo.num_reviews} review{algo.num_reviews === 1 ? "" : "s"}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>

      <Box mt={2}>
        <Button
          fullWidth
          variant="contained"
          size="small"
          onClick={handleViewDetails}
        >
          View Details
        </Button>
      </Box>
    </Card>
  );
}