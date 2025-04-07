import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../../components/navbar/Sidebar";
import DbNavbar from "./DbNavbar";
import Budget from "./budget/budget";
import Portfolio from "./portfolio/portfolio";
import Overview from "./overview/overview";
import "./dashboard.scss";

const Dashboard = ({ isAuthenticated, setIsAuthenticated }) => {
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
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
