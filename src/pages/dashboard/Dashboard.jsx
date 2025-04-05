import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../../components/navbar/Sidebar";
import DbNavbar from "./DbNavbar";

const Dashboard = ({ isAuthenticated, setIsAuthenticated }) => {
  return (
    <div className="dashboard-layout">
      <DbNavbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}/>
      <div className="main-content">
        <Sidebar setIsAuthenticated={setIsAuthenticated}/>
        <div className="content-area">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" />} />
            {/* Add routes like /overview or /jobtrack here */}
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
