import "./app.scss";
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from '@mui/material/styles';

import Intropage from "./pages/intropage/Intropage";
import Dashboard from "./pages/dashboard/Dashboard";
import NoPage from "./pages/NoPage";
import About from "./pages/about/About";

import IntroNavbar from "./components/intro/IntroNavbar";

const theme = createTheme({
  palette: {
    primary: {
      main: '#609978',
    },
    secondary: {
      main: '#E0C2FF',
    },
  },
  typography: {
    fontFamily: 'Quicksand, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 'bold',
          fontSize: '15px',
        },
      },
    },
  },
});

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
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
    </ThemeProvider>
  );
};

export default App;