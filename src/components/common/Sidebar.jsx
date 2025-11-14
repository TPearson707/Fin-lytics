import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  Toolbar,
  Box,
  Typography,
} from "@mui/material";
import {
  BackupTable as BackupTableIcon,
  AutoGraph as AutoGraphIcon,
  AccountBalanceWallet as AccountBalanceIcon,
} from "@mui/icons-material";
import { styled } from "@mui/system";
import axios from "axios";

const StyledListItem = styled(({ button, ...otherProps }) => {
  const { component: Component = "div", ...rest } = otherProps;
  return <ListItem {...rest} component={Component} />;
})(({ theme }) => ({
  color: "white",
  transition: "background-color 0.3s, transform 0.2s",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
    transform: "scale(1.05)",
  },
}));

const Sidebar = ({ setIsAuthenticated }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    navigate("/");
  };

  const getUser = async () => {
    if (setIsAuthenticated) {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:8000/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const { first_name, last_name, username, id } = response.data.User;
        setUser({ firstName: first_name, lastName: last_name, username, id });
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.error("Unauthorized: Redirecting to login.");
          navigate("/login");
        } else {
          console.error("Error fetching user:", error);
        }
      }
    } else {
      console.log("Could not get user, user is unauthorized");
    }
  };

  useEffect(() => {
    if (setIsAuthenticated) {
      getUser();
    }
  }, [setIsAuthenticated]);

  const openModal = (contentComponent) => {
    setModalContent(() => contentComponent);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalContent(null);
    setModalOpen(false);
  };

  return (
    <>
      <Drawer
        variant="permanent"
        anchor="left"
        sx={{
          zIndex: 1000, 
          width: 180,
          flexShrink: 0,
          position: "relative", 
          paddingTop: "64px",
          [`& .MuiDrawer-paper`]: {
            width: 180,
            boxSizing: "border-box",
            backgroundColor: "primary.main",
            color: "white",
          },
        }}
      >
        {/* Spacer for Navbar */}
        <Toolbar />
        <Box sx={{ overflow: "hidden" }}>
          <List>
            <StyledListItem button component={Link} to="/">
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                <BackupTableIcon />
              </ListItemIcon>
              <ListItemText
                primary={<Typography sx={{ fontSize: "1rem" }}>Overview</Typography>}
              />
            </StyledListItem>
            <StyledListItem button component={Link} to="/Stock">
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                <AutoGraphIcon />
              </ListItemIcon>
              <ListItemText
                primary={<Typography sx={{ fontSize: "1rem" }}>Stock AI</Typography>}
              />
            </StyledListItem>
            <StyledListItem button component={Link} to="/Budget">
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                <AccountBalanceIcon />
              </ListItemIcon>
              <ListItemText
                primary={<Typography sx={{ fontSize: "1rem" }}>Budgeter</Typography>}
              />
            </StyledListItem>
          </List>
          <Divider />
        </Box>
      </Drawer>

      <Dialog open={isModalOpen} onClose={closeModal} fullWidth maxWidth="sm">
        <DialogTitle>Modal</DialogTitle>
        <DialogContent>{modalContent ? modalContent() : null}</DialogContent>
      </Dialog>
    </>
  );
};

export default Sidebar;
