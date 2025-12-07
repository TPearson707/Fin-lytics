import React from "react";
import { Box, TextField, MenuItem } from "@mui/material";

export default function FilterBar({ filters, onChange }) {
  const handleSearchChange = (e) => {
    onChange({ search: e.target.value });
  };

  const handleSortChange = (e) => {
    onChange({ sortBy: e.target.value });
  };

  return (
    <Box
      sx={{
        mb: 3,
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        alignItems: "center",
      }}
    >
      <TextField
        size="small"
        label="Search algorithms..."
        value={filters.search}
        onChange={handleSearchChange}
        sx={{ minWidth: 220, flex: 1 }}
      />

      <TextField
        select
        size="small"
        label="Sort by"
        value={filters.sortBy}
        onChange={handleSortChange}
        sx={{ minWidth: 180 }}
      >
        <MenuItem value="popular">Most Popular</MenuItem>
        <MenuItem value="new">Newest</MenuItem>
        <MenuItem value="price_low">Price: Low → High</MenuItem>
        <MenuItem value="price_high">Price: High → Low</MenuItem>
        <MenuItem value="rating">Highest Rated</MenuItem>
      </TextField>
    </Box>
  );
}

