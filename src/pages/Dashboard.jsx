import { Routes, Route } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";
import DbNavbar from "../components/common/commonNavBar";
import "./Dashboard.scss";
import Budget from "./budget/budget";
import Overview from "./overview/Overview";
import Stock from "./stock/stock";
import StockInsights from "./stock/StockInsights";
import Plans from "./subscription/pages/Plans";
import Success from "./subscription/pages/Success";
import Marketplace from "./marketplace/Marketplace";

const Dashboard = ({ isAuthenticated, setIsAuthenticated }) => {
  return (
    <div className="dashboard-layout">
      {/* Navbar fixed at top */}
      <DbNavbar
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
      />

      <div className="main-content">
        {/* Permanent sidebar */}
        <Sidebar setIsAuthenticated={setIsAuthenticated} />

        {/* Main content area */}
        <div className="content-area">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/stock/:ticker" element={<StockInsights />} />

            {/* Subscription flow */}
            <Route path="/plans">
              <Route index element={<Plans />} /> {/* /dashboard/plans */}
              <Route path="success" element={<Success />} />
            </Route>
            <Route path="/marketplace" element={<Marketplace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
