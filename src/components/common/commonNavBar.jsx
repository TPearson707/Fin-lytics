import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  Avatar,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import finLogo from "../../assets/finLogo.png";
import SettingsBlock from "./modal/settings/settings";

const DbNavbar = ({ isAuthenticated, setIsAuthenticated }) => {
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    navigate("/");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const response = await fetch("/api/user", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            if (response.status === 401) {
              console.error("Unauthorized: Redirecting to login.");
              navigate("/login");
            }
            throw new Error("Unauthorized");
          }

          const contentType = response.headers.get("Content-Type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Invalid JSON response");
          }

          const data = await response.json();
          setUser(data);
        } else {
          console.error("No token found. Redirecting to login.");
          navigate("/login");
        }
      } catch (error) {
        console.error("Failed to fetch user data", error);
        if (error.message === "Unauthorized" || error.message === "Invalid JSON response") {
          navigate("/login");
        }
      }
    };

    if (isAuthenticated) {
      fetchUser();
    }
  }, [isAuthenticated]);

  return (
    <AppBar position="fixed" sx={{ backgroundColor: "white", color: "black", height: "64px" }}>
      <Toolbar>
        <Box sx={{ flexGrow: 1 }}>
          <img
            src={finLogo}
            alt="Finlytics Logo"
            style={{ height: "40px", cursor: "pointer" }}
            onClick={() => navigate("/")}
          />
        </Box>
        {isAuthenticated ? (
          <>
            <Avatar
              alt={user?.name || "User"}
              src={user?.avatar}
              onClick={handleMenuOpen}
              sx={{ cursor: "pointer" }}
            />
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  setSettingsOpen(true);
                }}
              >
                Settings
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  setLogoutConfirmOpen(true);
                }}
              >
                Logout
              </MenuItem>
            </Menu>
            <Dialog
              open={logoutConfirmOpen}
              onClose={() => setLogoutConfirmOpen(false)}
            >
              <DialogTitle>Confirm Logout</DialogTitle>
              <DialogContent>
                <Typography>Are you sure you want to log out?</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setLogoutConfirmOpen(false)} color="primary">
                  Cancel
                </Button>
                <Button onClick={handleLogout} color="primary">
                  Logout
                </Button>
              </DialogActions>
            </Dialog>
            <Dialog
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle>Settings</DialogTitle>
              <DialogContent>
                <SettingsBlock />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSettingsOpen(false)} color="primary">
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          </>
        ) : (
          <Button color="inherit" onClick={() => navigate("/login")}>
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default DbNavbar;