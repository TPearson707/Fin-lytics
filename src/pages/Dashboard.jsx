import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";
import DbNavbar from "../components/common/commonNavBar";
import Budget from "./budget/budget";
import Portfolio from "./portfolio/portfolio";
import Stock from "./stock/stock";
import "../styles/pages/dashboard/dashboard.scss";
import StockInsights from "./stock/StockInsights";
import Plans from "./subscription/pages/Plans";

const Dashboard = ({ isAuthenticated, setIsAuthenticated }) => {
  return (
    <div className="dashboard-layout" style={{ paddingTop: "64px" }}>
      <DbNavbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}/>
      <div className="main-content">
        <Sidebar setIsAuthenticated={setIsAuthenticated}/>
        <div className="content-area">
          <Routes>
            <Route path="/" element={<Portfolio />} />
            <Route path="/budget" element={<Budget/>} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/stock/:ticker" element={<StockInsights />} />
            <Route path="/plans" element={<Plans />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;