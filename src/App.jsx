import "./app.scss";
import React, { useState, useEffect, createContext } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";

import Intropage from "./pages/intropage/Intropage";
import Dashboard from "./pages/dashboard/Dashboard";
import Stock from "./pages/dashboard/stock/stock";
import StockInsights from "./pages/dashboard/stock/StockInsights";
import NoPage from "./pages/NoPage";
import About from "./pages/about/About";
import IntroNavbar from "./components/navbar/IntroNavbar";

// create context to share across app
export const UserContext = createContext(null);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settings, setSettings] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // helper to add token headers
  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        setIsAuthenticated(false);
        return;
      }

      try {
        const [settingsRes, userInfoRes] = await Promise.all([
          axios.get("http://localhost:8000/user_settings/", {
            headers: authHeaders(),
            withCredentials: true,
          }),
          axios.get("http://localhost:8000/user_info/", {
            headers: authHeaders(),
            withCredentials: true,
          }),
        ]);

        setSettings(settingsRes.data);
        setUserInfo(userInfoRes.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error(
          "Error during init fetch:",
          error.response ? error.response.data : error
        );
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isAuthenticated]); // refetch whenever auth status changes

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // guard: don’t render dashboard routes until settings are loaded
  if (isAuthenticated && (!settings || !userInfo)) {
    return <div className="loading">Loading user settings...</div>;
  }

  return (
    <UserContext.Provider
      value={{ settings, setSettings, userInfo, setUserInfo }}
    >
      <BrowserRouter>
        {isAuthenticated ? (
          <Routes>

            <Route
              path="/*"
              element={
                <Dashboard
                  isAuthenticated={isAuthenticated}
                  setIsAuthenticated={setIsAuthenticated}
                />
              }
            />
          </Routes>
        ) : (
          <>
            <IntroNavbar />
            <Routes>
              <Route
                path="/"
                element={<Intropage setIsAuthenticated={setIsAuthenticated} />}
              />
              <Route path="/about" element={<About />} />
              <Route
                path="/login"
                element={<Intropage setIsAuthenticated={setIsAuthenticated} />}
              />
              <Route path="*" element={<NoPage />} />
            </Routes>
          </>
        )}
      </BrowserRouter>
    </UserContext.Provider>
  );
};

export default App;
