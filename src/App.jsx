import "./app.scss";
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Intropage from "./pages/intropage/Intropage";
import Dashboard from "./pages/dashboard/Dashboard";

import About from "./pages/about/About";
import JobTrack from "./pages/jobtrack/jobtrack";
import NoPage from "./pages/NoPage";

import DbNavbar from "./components/navbar/DbNavbar";
import IntroNavbar from "./components/navbar/IntroNavbar";

const isAuthenticated = false; //manually change user auth

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if the user is authenticated on initial load (e.g., from localStorage)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <BrowserRouter>
      {isAuthenticated ? <DbNavbar /> : <IntroNavbar />}

      <Routes>
        {isAuthenticated ? (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobtrack" element={<JobTrack />} />
            <Route path="/about" element={<About />} />
            {/* <Route path="/contact" element={<Contact />} /> */}
          </>
        ) : (
          <>
            <Route path="/" element={<Intropage />} />
            <Route path="/about" element={<About />} />
            {/* <Route path="/contact" element={<Contact />} /> */}
          </>
        )}

        {/* <Route path="/dashboard" element={<Dashboard />} /> */}

        <Route path="*" element={<NoPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
