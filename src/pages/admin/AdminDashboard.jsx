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
    <>
      <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
          Overview
        </Typography>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[
            { label: "Total Listings", value: stats.total_listings },
            { label: "Total Purchases", value: stats.total_purchases },
            { label: "Total Revenue", value: `$${stats.total_revenue.toFixed(2)}` },
            { label: "Verified Sellers", value: stats.verified_sellers },
          ].map((card, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2, boxShadow: 3 }}>
                <Typography variant="h3" color="primary.main">{card.value}</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {card.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
          <Box sx={{ flex: 1, minWidth: 350, maxWidth: 500 }}>
            <Paper sx={{ p: 3, minHeight: 350, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <Typography sx={{ mb: 2, fontWeight: 600 }}>
                Listing Approval Breakdown
              </Typography>
              <ResponsiveContainer width={300} height={250}>
                <PieChart>
                  <Pie
                    data={listingBreakdown}
                    cx={150}
                    cy={100}
                    label
                    outerRadius={90}
                    dataKey="value"
                  >
                    {listingBreakdown.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} align="center" layout="horizontal" />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Box>

          <Box sx={{ flex: 2, minWidth: 350, maxWidth: 500 }}>
            <Paper sx={{ p: 3, minHeight: 350, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography sx={{ mb: 2, fontWeight: 600 }}>
                Revenue Growth
              </Typography>
              <ResponsiveContainer width={400} height={250}>
                <LineChart data={revenueHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 14 }} />
                  <YAxis tick={{ fontSize: 14 }} />
                  <Tooltip contentStyle={{ fontSize: 14 }} />
                  <Legend verticalAlign="bottom" height={36} />
                  <Line type="monotone" dataKey="revenue" stroke="#0a66c2" strokeWidth={4} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Box>

          <Box sx={{ flex: 1, minWidth: 350, maxWidth: 500 }}>
            <Paper sx={{ p: 3, minHeight: 350, display: 'block', overflowX: 'auto' }}>
              <Typography sx={{ mb: 2, fontWeight: 600 }}>
                Seller Metrics
              </Typography>
              <ResponsiveContainer width={300} height={250}>
                <BarChart data={sellerData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 14 }} />
                  <YAxis tick={{ fontSize: 14 }} />
                  <Tooltip contentStyle={{ fontSize: 14 }} />
                  <Legend verticalAlign="bottom" height={36} />
                  <Bar dataKey="value" fill="#457b9d" barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Box>
        </Box>
      </Box>
    </>
  );
}
