import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Link,
  Divider,
} from "@mui/material";
import axios from "axios";

const CompanySnapshotCard = ({ ticker }) => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ticker) return;
    const fetchCompany = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`http://127.0.0.1:8000/stocks/company/${ticker}`);
        setCompany(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load company info");
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [ticker]);

  return (
    <Paper
      elevation={3}
      sx={{
        flex: 1,
        p: 3,
        border: "1px solid #dcdcdc",
        borderRadius: 2,
        backgroundColor: "#fafafa",
        minHeight: 280,
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Company Snapshot
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress size={30} />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : company ? (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {company.companyName || ticker}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {company.exchange} • {company.sector || "N/A"} / {company.industry || "N/A"}
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            <strong>CEO:</strong> {company.ceo || "N/A"}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            <strong>Market Cap:</strong>{" "}
            {company.marketCap
              ? `$${(company.marketCap / 1_000_000_000).toFixed(2)}B`
              : "N/A"}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            <strong>Website:</strong>{" "}
            {company.website ? (
              <Link
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                color="primary"
              >
                {company.website}
              </Link>
            ) : (
              "N/A"
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {company.description?.slice(0, 240) || "No description available."}
            {company.description?.length > 240 && "..."}
          </Typography>
        </Box>
      ) : (
        <Typography>No data available.</Typography>
      )}
    </Paper>
  );
};

export default CompanySnapshotCard;
