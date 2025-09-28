import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";
import DbNavbar from "../components/common/commonNavBar";
import Budget from "./budget/budget";
import Portfolio from "./portfolio/portfolio";
import Stock from "./stock/stock";
import "../styles/pages/dashboard/dashboard.scss";

const Dashboard = ({ isAuthenticated, setIsAuthenticated }) => {
  return (
    <div className="dashboard-layout" style={{ paddingTop: "64px" }}>
      <DbNavbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}/>
      <div className="main-content">
        <Sidebar setIsAuthenticated={setIsAuthenticated}/>
        <div className="content-area">
          <Routes>
            <Route path="/budget" element={<Budget/>} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/stock" element={<Stock />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
