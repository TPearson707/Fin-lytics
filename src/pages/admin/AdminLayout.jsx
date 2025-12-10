import { useEffect, useState } from "react";
import { Box, Toolbar, Tabs, Tab, CircularProgress } from "@mui/material";
import api from "../../api";

import AdminDashboard from "./AdminDashboard";
import PendingApprovals from "./PendingApprovals";
import ManageListings from "./ManageListings";
import ManageSellers from "./ManageSellers";

export default function AdminLayout() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await api.get("/auth/me");
        if (!res.data.is_admin) window.location.href = "/dashboard";
        setUser(res.data);
      } catch {
        window.location.href = "/login";
      }
    }
    fetchMe();
  }, []);

  if (!user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  const tabs = ["Overview", "Pending Approvals", "Manage Listings", "Manage Sellers"];
  const components = [
    <AdminDashboard key="dash" />,
    <PendingApprovals key="pending" />,
    <ManageListings key="listings" />,
    <ManageSellers key="sellers" />
  ];

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Toolbar />

      {/* Navigation */}
      <Tabs
        value={tab}
        onChange={(e, val) => setTab(val)}
        sx={(theme) => ({
          borderBottom: `1px solid ${theme.palette.divider}`,
        })}
      >
        {tabs.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {/* Content */}
      <Box
        sx={(theme) => ({
          flexGrow: 1,
          overflowY: "auto",
          p: 3,
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
        })}
      >
        {components[tab]}
      </Box>
    </Box>
  );
}
