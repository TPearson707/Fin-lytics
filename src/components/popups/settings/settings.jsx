import { useEffect, useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import ToggleButton from "./togglebutton";
import axios from "axios";

const SettingsBlock = () => {
  const [linkToken, setLinkToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is already linked to Plaid
  useEffect(() => {
    const checkPlaidStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        await axios.get("http://localhost:8000/accounts", {
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
          "http://localhost:8000/create_link_token",
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

    fetchLinkToken();
  }, []);

  // Handle successful Plaid Link connection
  const onSuccess = useCallback(async (publicToken, metadata) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:8000/exchange_public_token",
        { public_token: publicToken },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setIsLoggedIn(true);
    } catch (error) {
      console.error(
        "Error exchanging public token:",
        error.response ? error.response.data : error
      );
    }
  }, []);

  const config = linkToken ? { token: linkToken, onSuccess } : null;
  const { open, ready } = usePlaidLink(config || {});

  return (
    <div className="settings-content">
      <h2>Settings</h2>
      <p>Adjust your preferences here.</p>
      <NotificationSettings />
      <FinanceSettings
        isLoggedIn={isLoggedIn}
        linkToken={linkToken}
        open={open}
        ready={ready}
        setIsLoggedIn={setIsLoggedIn}
      />
    </div>
  );
};

export default SettingsBlock;

const NotificationSettings = () => {
  return (
    <div className="settings-section">
      <div className="notif-block">
        <ToggleButton label="Email Notifications" />
      </div>
      <div className="notif-block">
        <ToggleButton label="SMS Notifications" />
      </div>
      <div className="notif-block">
        <ToggleButton label="Push Notifications" />
      </div>
    </div>
  );
};

const FinanceSettings = ({ isLoggedIn, linkToken, open, ready, setIsLoggedIn }) => {
  // Function to call the unlink endpoint
  const handleUnlink = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete("http://localhost:8000/unlink", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setIsLoggedIn(false);
    } catch (error) {
      console.error(
        "Error unlinking Plaid account:",
        error.response ? error.response.data : error
      );
    }
  };

  return (
    <div className="settings-section">
      <p>{isLoggedIn ? "Logged into Plaid" : "Not logged into Plaid"}</p>
      {isLoggedIn ? (
        <button onClick={handleUnlink}>Unlink Plaid</button>
      ) : (
        linkToken && (
          <button onClick={() => open()} disabled={!ready}>
            Log into Plaid
          </button>
        )
      )}
    </div>
  );
};

const AccountSettings = () => {
  return (
    <div className="settings-section">
      <h2>empty</h2>
    </div>
  );
};