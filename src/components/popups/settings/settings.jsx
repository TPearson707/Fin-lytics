import { useState, useCallback, useContext } from "react";
import { usePlaidLink } from "react-plaid-link";
import ToggleButton from "./togglebutton";
import axios from "axios";
import api from "../../../api";
import plaidLogo from "../../../assets/plaidlogo.png";
import "./settings.scss";
import { UserContext } from "../../../App";

const SettingsBlock = () => {
  const { settings, setSettings, userInfo, setUserInfo } = useContext(UserContext);
  const [linkToken, setLinkToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Fetch link token for Plaid Link flow
  const fetchLinkToken = useCallback(async () => {
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
      console.error("Error fetching Plaid link token:", error.response ? error.response.data : error);
    }
  }, []);

  // Handle successful Plaid Link connection
  const onSuccess = useCallback(async (publicToken) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:8000/exchange_public_token/",
        {
          public_token: publicToken,
          account_type: "bank",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setIsLoggedIn(true);

      // optionally trigger investment data fetch
      await axios.get("http://localhost:8000/investments/", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
    } catch (error) {
      console.error("Error exchanging public token:", error.response ? error.response.data : error);
    }
  }, []);

  const handleToggleChange = async (name, value) => {
    try {
      const token = localStorage.getItem("token");
      const updatedSettings = { ...settings, [name]: value };
      setSettings(updatedSettings);

      await axios.post("http://localhost:8000/user_settings/", updatedSettings, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
    } catch (error) {
      console.error("Error updating user settings:", error.response ? error.response.data : error);
    }
  };

  const handleUpdateUser = async (updateData) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:8000/auth/update/", updateData, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      alert("User account settings updated successfully");
      // update local context
      setUserInfo({ ...userInfo, ...updateData });
    } catch (error) {
      console.error("Error updating user settings:", error.response ? error.response.data : error);
    }
  };

  const config = linkToken
    ? {
        token: linkToken,
        onSuccess,
      }
    : null;

  const { open, ready } = usePlaidLink(config || {});

  return (
    <div className="settings-content">
      <h2>Settings</h2>
      <AccountSettings userInfo={userInfo} onUpdateUser={handleUpdateUser} />
      <NotificationSettings settings={settings} onToggleChange={handleToggleChange} />
      <FinanceSettings
        isLoggedIn={isLoggedIn}
        linkToken={linkToken}
        open={open}
        ready={ready}
        setIsLoggedIn={setIsLoggedIn}
        fetchLinkToken={fetchLinkToken}
      />
    </div>
  );
};

export default SettingsBlock;

const AccountSettings = ({ userInfo, onUpdateUser }) => {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const updateData = {};
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phone_number = phoneNumber;
    if (newPassword) updateData.password = newPassword;
    onUpdateUser(updateData);
    setShowEmailForm(false);
    setShowPhoneForm(false);
    setShowPasswordForm(false);
  };

  return (
    <div className="settings-section">
      <h3>Account</h3>
      <div className={`account-block ${showEmailForm ? "expanded" : ""}`}>
        <p>Email: {userInfo?.email}</p>
        <button
          onClick={() => setShowEmailForm(!showEmailForm)}
          className={`form-btn ${showEmailForm ? "expanded" : ""}`}
        >
          Edit
          <span className="arrow">▼</span>
        </button>
        {showEmailForm && (
          <form onSubmit={handleSubmit} className="submit-container">
            <div className="form-block">
              <label style={{ fontSize: "small" }}>New Email: </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button type="submit" className="submit-btn">Update</button>
            </div>
          </form>
        )}
      </div>

      <div className={`account-block ${showPhoneForm ? "expanded" : ""}`}>
        <p>Phone Number: {userInfo?.phone_number}</p>
        <button
          onClick={() => setShowPhoneForm(!showPhoneForm)}
          className={`form-btn ${showPhoneForm ? "expanded" : ""}`}
        >
          Edit
          <span className="arrow">▼</span>
        </button>
        {showPhoneForm && (
          <form onSubmit={handleSubmit} className="submit-container">
            <div className="form-block">
              <label style={{ fontSize: "small" }}>New Number:</label>
              <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              <button type="submit" className="submit-btn">Update</button>
            </div>
          </form>
        )}
      </div>

      <div className={`account-block ${showPasswordForm ? "expanded" : ""}`}>
        <p>Password: </p>
        <button
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          className={`form-btn ${showPasswordForm ? "expanded" : ""}`}
        >
          Edit
          <span className="arrow">▼</span>
        </button>
        {showPasswordForm && (
          <form onSubmit={handleSubmit} className="submit-container">
            <div className="form-block">
              <label style={{ fontSize: "small" }}>Old Password: </label>
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            </div>
            <div className="form-block">
              <label style={{ fontSize: "small" }}>New Password: </label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="form-block">
              <label style={{ fontSize: "small" }}>Confirm Password: </label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <button type="submit" className="submit-btn">Update</button>
          </form>
        )}
      </div>
    </div>
  );
};

const NotificationSettings = ({ settings, onToggleChange }) => (
  <div className="settings-section">
    <h3>Notifications</h3>
    <div className="notif-block">
      <p>Email Notifications:</p>
      <ToggleButton
        label="Email Notifications"
        checked={settings?.email_notifications || false}
        onChange={(value) => onToggleChange("email_notifications", value)}
      />
    </div>
    <div className="notif-block">
      <p>Push Notifications:</p>
      <ToggleButton
        label="Push Notifications"
        checked={settings?.push_notifications || false}
        onChange={(value) => onToggleChange("push_notifications", value)}
      />
    </div>
  </div>
);

const FinanceSettings = ({ isLoggedIn, linkToken, open, ready, setIsLoggedIn, fetchLinkToken }) => {
  const [brokerageLinkToken, setBrokerageLinkToken] = useState(null);
  const [isBrokerageConnected, setIsBrokerageConnected] = useState(false);

  // fetch brokerage token if logged in
  const handleFetchBrokerage = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:8000/create_link_token/",
        { product: "investments" },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setBrokerageLinkToken(response.data.link_token);
    } catch (error) {
      console.error("Error fetching brokerage link token:", error.response ? error.response.data : error);
    }
  };

  // Unlink Plaid account
  const handleUnlink = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete("http://localhost:8000/unlink", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setIsLoggedIn(false);
      setIsBrokerageConnected(false);
    } catch (error) {
      console.error("Error unlinking Plaid account:", error.response ? error.response.data : error);
    }
  };

  const brokerageConfig = brokerageLinkToken
    ? {
        token: brokerageLinkToken,
        onSuccess: async (publicToken) => {
          try {
            const token = localStorage.getItem("token");
            await axios.post(
              "http://localhost:8000/exchange_public_token/",
              {
                public_token: publicToken,
                account_type: "brokerage",
              },
              {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
              }
            );
            setIsBrokerageConnected(true);
          } catch (error) {
            console.error("Error exchanging brokerage token:", error.response ? error.response.data : error);
          }
        },
      }
    : null;

  const { open: openBrokerage, ready: brokerageReady } = usePlaidLink(brokerageConfig || {});

  return (
    <div className="settings-section">
      <h3>Connect your Bank Account</h3>
      <button
        onClick={isLoggedIn ? handleUnlink : () => { fetchLinkToken(); open(); }}
        disabled={!ready && !isLoggedIn}
        className="plaid"
      >
        <img src={plaidLogo} alt="Plaid Logo" className="plaid-logo" />
        {isLoggedIn ? "Unlink Plaid" : "Log into Plaid"}
      </button>

      {isLoggedIn && (
        <div className="investment-actions">
          <h4>Connect Brokerage Account</h4>
          <button
            onClick={isBrokerageConnected ? handleFetchBrokerage : () => openBrokerage()}
            disabled={!brokerageReady && !isBrokerageConnected}
            className="brokerage-button"
          >
            <img src={plaidLogo} alt="Plaid Logo" className="plaid-logo" />
            {isBrokerageConnected ? "Refresh Brokerage Data" : "Connect Brokerage"}
          </button>
        </div>
      )}
    </div>
  );
};
