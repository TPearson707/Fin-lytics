import React from "react";
import { Box, Button } from "@mui/material";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <Box
      mt={4}
      display="flex"
      justifyContent="center"
      alignItems="center"
      gap={1.5}
      flexWrap="wrap"
    >
      <Button
        variant="outlined"
        size="small"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Prev
      </Button>

      {pageNumbers.map((page, idx) =>
        page === "..." ? (
          <Box key={`ellipsis-${idx}`} sx={{ px: 0.5 }}>
            …
          </Box>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? "contained" : "outlined"}
            size="small"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        )
      )}

      <Button
        variant="outlined"
        size="small"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </Button>
    </Box>
  );
}

/**
 * Helper to create compact pagination (e.g. 1 2 3 ... 10)
 */
function getPageNumbers(current, total) {
  const pages = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  pages.push(1);

  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) pages.push("...");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("...");

  pages.push(total);
  return pages;
}