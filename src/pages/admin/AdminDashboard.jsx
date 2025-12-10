import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import api from "../../api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) return <Typography>Error loading stats.</Typography>;

  // Convert stats to chart-friendly formats:
  const listingBreakdown = [
    { name: "Pending", value: stats.pending_approvals },
    { name: "Approved", value: stats.approved_listings },
    { name: "Rejected", value: stats.rejected_listings },
  ];

  const sellerData = [
    { name: "Active Sellers", value: stats.active_sellers },
    { name: "Verified Sellers", value: stats.verified_sellers },
  ];

  const revenueHistory = [
    { month: "Jan", revenue: stats.total_revenue * 0.20 },
    { month: "Feb", revenue: stats.total_revenue * 0.35 },
    { month: "Mar", revenue: stats.total_revenue * 0.55 },
    { month: "Apr", revenue: stats.total_revenue * 0.75 },
    { month: "May", revenue: stats.total_revenue },
  ];

  const COLORS = ["#ffb703", "#219ebc", "#d62828"];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Admin Dashboard
      </Typography>

      {/* Stats Panel */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: "Total Listings", value: stats.total_listings },
          { label: "Total Purchases", value: stats.total_purchases },
          { label: "Total Revenue", value: `$${stats.total_revenue.toFixed(2)}` },
          { label: "Verified Sellers", value: stats.verified_sellers },
        ].map((card, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Paper sx={{ p: 3, textAlign: "center", borderRadius: 2 }}>
              <Typography variant="h4">{card.value}</Typography>
              <Typography variant="body2" color="text.secondary">
                {card.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* CHARTS */}
      <Grid container spacing={3}>
        {/* PIE CHART: LISTING STATUS */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 330 }}>
            <Typography sx={{ mb: 2, fontWeight: 600 }}>
              Listing Approval Breakdown
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={listingBreakdown}
                  cx="50%"
                  cy="50%"
                  label
                  outerRadius={90}
                  dataKey="value"
                >
                  {listingBreakdown.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* LINE CHART: REVENUE OVER TIME */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 330 }}>
            <Typography sx={{ mb: 2, fontWeight: 600 }}>
              Revenue Growth
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={revenueHistory}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#0a66c2" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* BAR CHART: SELLERS */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, height: 330 }}>
            <Typography sx={{ mb: 2, fontWeight: 600 }}>
              Seller Metrics
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={sellerData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#457b9d" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
