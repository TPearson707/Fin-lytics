import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../../components/common/Sidebar";
import DbNavbar from "./DbNavbar";
import Budget from "./budget/budget";
import Portfolio from "./portfolio/portfolio";
import Overview from "./overview/overview";
import Stock from "./stock/stock";
import StockInsights from "./stock/StockInsights";
import "./dashboard.scss";

const Dashboard = ({ isAuthenticated, setIsAuthenticated }) => {

  console.log("Dashboard render - isAuthenticated:", isAuthenticated);

  return (
    <div className="dashboard-layout">
      <DbNavbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}/>
      <div className="main-content">
        <Sidebar setIsAuthenticated={setIsAuthenticated}/>
        <div className="content-area">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/budget" element={<Budget/>} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/stock/:ticker" element={<StockInsights />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
