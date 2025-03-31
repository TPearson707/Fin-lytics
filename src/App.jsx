import "./app.scss";
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Intropage from "./pages/intropage/Intropage";
import Dashboard from "./pages/dashboard/Dashboard";
import NoPage from "./pages/NoPage";
import About from "./pages/about/About";

import IntroNavbar from "./components/navbar/IntroNavbar";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <BrowserRouter>
      {isAuthenticated ? (
        <Routes>
          <Route path="/*" element={<Dashboard isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}/>} /> 
        </Routes>
      ) : (
        <>
          <IntroNavbar />
          <Routes>
            <Route path="/" element={<Intropage setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Intropage setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="*" element={<NoPage />} />
          </Routes>
        </>
      )}
    </BrowserRouter>
  );
};

export default App;