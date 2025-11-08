import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { usePlaidLink } from "react-plaid-link";
import axios from "axios";
import api from "../../../../api";
import plaidLogo from "../../../../assets/plaidlogo.png";
import "../../../../styles/components/modal/settings.scss";

const SettingsBlock = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [linkToken, setLinkToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [settings, setSettings] = useState({
    email_notifications: false,
    sms_notifications: false,
    push_notifications: false,
  });
  const [userInfo, setUserInfo] = useState({
    email: "",
    phone_number: "",
  });
  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [editingField, setEditingField] = useState(null);
  const [tempUserInfo, setTempUserInfo] = useState({});
  const [editingPassword, setEditingPassword] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState({
    next_billing_date: null,
    cancel_at: null,
    subscription_status: null,
  });

  // Check if user is already linked to Plaid
  useEffect(() => {
    const checkPlaidStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        await api.get("http://localhost:8000/accounts/", {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        setIsLoggedIn(true);
      } catch (error) {
        setIsLoggedIn(false);
      }
    };

    checkPlaidStatus();
  }, []);

  // Fetch link token for Plaid Link flow
  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.post(
          "http://localhost:8000/create_link_token/",
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
        setLinkToken(response.data.link_token);
      } catch (error) {
        console.error(
          "Error fetching Plaid link token:",
          error.response ? error.response.data : error
        );
      }
    };

    const fetchUserSettings = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:8000/user_settings/", // change made by Thomas Pearson
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
        console.log("Fetched user settings:", response.data); //debug
        setSettings(response.data);
      } catch (error) {
        console.error("Error fetching user settings:", error.response ? error.response.data : error);
      }
    };

    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:8000/user_info/",
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
        setUserInfo(response.data);
      } catch (error) {
        console.error("Error fetching user info:", error.response ? error.response.data : error);
      }
    };

    const checkSubscriptionStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await api.get("/stripe/subscription/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHasSubscription(response.data.has_subscription);
        setSubscriptionInfo({
          next_billing_date: response.data.next_billing_date || null,
          cancel_at: response.data.cancel_at || null,
          subscription_status: response.data.subscription_status || null,
        });
      } catch (error) {
        console.error("Error checking subscription status:", error);
        setHasSubscription(false);
        setSubscriptionInfo({
          next_billing_date: null,
          cancel_at: null,
          subscription_status: null,
        });
      }
    };

    fetchLinkToken();
    fetchUserSettings();
    fetchUserInfo();
    checkSubscriptionStatus();
  }, []);

  // Handle successful Plaid Link connection
  const onSuccess = useCallback(async (publicToken, metadata) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:8000/exchange_public_token/",
        { 
          public_token: publicToken,
          account_type: "bank"
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setIsLoggedIn(true);
      
      // Fetch investment data after successful Plaid connection
      try {
        await axios.get(
          "http://localhost:8000/investments/",
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
        
      } catch (error) {
        console.error(
          "Error importing investment data:",
          error.response ? error.response.data : error
        );
      }
    } catch (error) {
      console.error(
        "Error exchanging public token:",
        error.response ? error.response.data : error
      );
    }
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const handlePlaidSuccess = useCallback(async (publicToken) => {
    try {
      const response = await fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ public_token: publicToken }),
      });
      if (!response.ok) {
        throw new Error("Failed to exchange Plaid token");
      }
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Error exchanging Plaid token:", error);
    }
  }, []);

  const handleEditField = (field) => {
    setEditingField(field);
    setTempUserInfo({ ...userInfo });
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setTempUserInfo({});
  };

  const handleSaveField = async (field) => {
    try {
      const updatedInfo = { [field]: tempUserInfo[field] };
      const response = await fetch("/api/user-info", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(updatedInfo),
      });
      if (!response.ok) {
        throw new Error("Failed to update user info");
      }
      setUserInfo((prev) => ({ ...prev, ...updatedInfo }));
      setEditingField(null);
      setTempUserInfo({});
      alert("User info updated successfully");
    } catch (error) {
      console.error("Error updating user info:", error);
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswords((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    try {
      const response = await fetch("/api/user-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(passwords),
      });
      if (!response.ok) {
        throw new Error("Failed to update password");
      }
      alert("Password updated successfully");
      setEditingPassword(false);
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Error updating password:", error);
    }
  };

  const handleCancelPasswordEdit = () => {
    setEditingPassword(false);
    setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleToggleChange = (name, value) => {
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleManageSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      const token = localStorage.getItem("token");
      const response = await api.post(
        "/stripe/create-portal-session",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Redirect to Stripe customer portal
      if (response.data.portal_url) {
        window.location.href = response.data.portal_url;
      }
    } catch (err) {
      console.error("Error creating portal session:", err);
      alert(
        err.response?.data?.detail ||
          "Failed to access subscription management. Please try again."
      );
    } finally {
      setSubscriptionLoading(false);
    }
  };

  return (
    <Box>
      <Tabs value={tabIndex} onChange={handleTabChange} centered>
        <Tab label="Account" />
        <Tab label="Notifications" />
      </Tabs>
      {tabIndex === 0 && (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6">Account Information</Typography>
          <Box sx={{ mt: 2 }}>
            <Typography>Email: {userInfo.email}</Typography>
            {editingField === "email" ? (
              <>
                <TextField
                  value={tempUserInfo.email}
                  onChange={(e) =>
                    setTempUserInfo((prev) => ({ ...prev, email: e.target.value }))
                  }
                  fullWidth
                  margin="normal"
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleSaveField("email")}
                  sx={{ mt: 1, mr: 1 }}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleCancelEdit}
                  sx={{ mt: 1 }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => handleEditField("email")}
                sx={{ mt: 1 }}
              >
                Edit
              </Button>
            )}
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography>Phone Number: {userInfo.phone_number}</Typography>
            {editingField === "phone_number" ? (
              <>
                <TextField
                  value={tempUserInfo.phone_number}
                  onChange={(e) =>
                    setTempUserInfo((prev) => ({
                      ...prev,
                      phone_number: e.target.value,
                    }))
                  }
                  fullWidth
                  margin="normal"
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleSaveField("phone_number")}
                  sx={{ mt: 1, mr: 1 }}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleCancelEdit}
                  sx={{ mt: 1 }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => handleEditField("phone_number")}
                sx={{ mt: 1 }}
              >
                Edit
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6">Password</Typography>
          {editingPassword ? (
            <>
              <TextField
                label="Old Password"
                type="password"
                value={passwords.oldPassword}
                onChange={(e) => handlePasswordChange("oldPassword", e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="New Password"
                type="password"
                value={passwords.newPassword}
                onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Confirm Password"
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                fullWidth
                margin="normal"
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSavePassword}
                sx={{ mt: 1, mr: 1 }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleCancelPasswordEdit}
                sx={{ mt: 1 }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setEditingPassword(true)}
              sx={{ mt: 1 }}
            >
              Edit Password
            </Button>
          )}

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6">Subscription</Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {hasSubscription
                ? "You have an active subscription"
                : "No active subscription"}
            </Typography>
            
            {/* Display billing information */}
            {hasSubscription && subscriptionInfo.cancel_at && (
              <Typography variant="body2" sx={{ mb: 1, color: "warning.main" }}>
                Subscription ends on: {new Date(subscriptionInfo.cancel_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            )}
            
            {hasSubscription && !subscriptionInfo.cancel_at && subscriptionInfo.next_billing_date && (
              <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
                Next billing date: {new Date(subscriptionInfo.next_billing_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            )}
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleManageSubscription}
              disabled={subscriptionLoading || !hasSubscription}
              sx={{ mt: 1 }}
            >
              {subscriptionLoading ? "Loading..." : "Manage Subscription"}
            </Button>
          </Box>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6">Plaid Connection</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={isLoggedIn ? null : () => {}}
            sx={{ mt: 2 }}
          >
            {isLoggedIn ? "Connected to Plaid" : "Connect to Plaid"}
          </Button>
        </Box>
      )}
      {tabIndex === 1 && (
        <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h6">Notification Settings</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={settings.email_notifications}
                onChange={(e) =>
                  handleToggleChange("email_notifications", e.target.checked)
                }
              />
            }
            label="Email Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.sms_notifications}
                onChange={(e) =>
                  handleToggleChange("sms_notifications", e.target.checked)
                }
              />
            }
            label="SMS Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.push_notifications}
                onChange={(e) =>
                  handleToggleChange("push_notifications", e.target.checked)
                }
              />
            }
            label="Push Notifications"
          />
        </Box>
      )}
    </Box>
  );
};

export default SettingsBlock;
