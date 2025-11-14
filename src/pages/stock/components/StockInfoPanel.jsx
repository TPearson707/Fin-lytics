import React from "react";
import { Box } from "@mui/material";
import CompanySnapshotCard from "./CompanySnapshotCard";
import RecentNewsCard from "./RecentNewsCard";

const StockInfoPanel = ({ ticker }) => {
  if (!ticker) return null; // early exit if no ticker provided

  return (
    <Box
      display="flex"
      flexDirection={{ xs: "column", md: "row" }}
      gap={3}
      mt={3}
    >
      <CompanySnapshotCard ticker={ticker} />
      <RecentNewsCard ticker={ticker} />
    </Box>
  );
};

export default StockInfoPanel;
