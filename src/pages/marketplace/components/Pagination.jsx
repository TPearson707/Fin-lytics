import React from "react";
import { Box, Button } from "@mui/material";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <Box mt={4} display="flex" justifyContent="center" alignItems="center" gap={1.5} flexWrap="wrap">
      <Button disabled={currentPage === 1} size="small" variant="outlined" onClick={() => onPageChange(currentPage - 1)}>
        Prev
      </Button>

      {pageNumbers.map((page, idx) =>
        page === "..." ? (
          <Box key={idx}>…</Box>
        ) : (
          <Button
            key={page}
            size="small"
            variant={currentPage === page ? "contained" : "outlined"}
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        )
      )}

      <Button disabled={currentPage === totalPages} size="small" variant="outlined" onClick={() => onPageChange(currentPage + 1)}>
        Next
      </Button>
    </Box>
  );
}

function getPageNumbers(current, total) {
  if (total <= 7) return [...Array(total)].map((_, i) => i + 1);

  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  return [
    1,
    ...(left > 2 ? ["..."] : []),
    ...[...Array(right - left + 1)].map((_, i) => left + i),
    ...(right < total - 1 ? ["..."] : []),
    total,
  ];
}
