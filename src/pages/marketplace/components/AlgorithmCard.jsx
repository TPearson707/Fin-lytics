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

        {algo.tags?.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 1.5 }}>
            {algo.tags.slice(0, 3).map(tag => (
              <Chip key={tag} label={tag} size="small" />
            ))}
            {algo.tags.length > 3 && (
              <Chip label={`+${algo.tags.length - 3}`} size="small" variant="outlined" />
            )}
          </Stack>
        )}

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {algo.price === 0 ? "Free" : `$${algo.price.toFixed(2)} / month`}
            </Typography>

            {algo.updated_at && (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Updated: {new Date(algo.updated_at).toLocaleDateString()}
              </Typography>
            )}
          </Box>

          <Box textAlign="right">
            <Rating value={Number(algo.rating) || 0} precision={0.5} readOnly size="small" />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {algo.num_reviews ?? 0} reviews
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <Button fullWidth variant="contained" size="small" sx={{ mt: 2 }} onClick={() => navigate(`/marketplace/${algo.id}`)}>
        View Details
      </Button>
    </Card>
  );
}
