import { Routes, Route } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";
import DbNavbar from "../components/common/commonNavBar";
import "../styles/pages/dashboard/Dashboard.scss";
import Budget from "./budget/budget";
import Overview from "./overview/Overview";
import Stock from "./stock/stock";
import StockInsights from "./stock/StockInsights";
import Plans from "./subscription/pages/Plans";
import Success from "./subscription/pages/Success";
import Marketplace from "./marketplace/Marketplace";
import AlgorithmDetails from "./marketplace/AlgorithmDetails";
import CreateListing from "./marketplace/CreateListing";
import EditListing from "./marketplace/EditListing";

// --- ADMIN IMPORTS ---
import AdminDashboard from "./admin/AdminDashboard";
import PendingApprovals from "./admin/PendingApprovals";
import ManageListings from "./admin/ManageListings";
import ManageSellers from "./admin/ManageSellers";
import AdminLayout from "./admin/AdminLayout";

const Dashboard = ({ isAuthenticated, setIsAuthenticated }) => {

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch("http://localhost:8000/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        }
      } catch (err) {
        console.warn("⚠ Failed to fetch user in Dashboard router.");
      }
    }

    loadUser();
  }, []);

  const isAdmin = currentUser?.is_admin === true;

  return (
    <div className="dashboard-layout" style={{ paddingTop: "64px" }}>
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

            {/* ---- MARKETPLACE ---- */}
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/create" element={<CreateListing />} />
            <Route path="/marketplace/edit/:id" element={<EditListing />} />

            {/* Dynamic MUST stay last */}
            <Route path="/marketplace/:id" element={<AlgorithmDetails />} />

            {/* ---- ADMIN ROUTES (Protected) ---- */}
            {isAdmin && (
              <>
                <Route path="/admin" element={<AdminLayout />} />
                {/* <Route path="/admin/approvals" element={<PendingApprovals />} />
                <Route path="/admin/listings" element={<ManageListings />} />
                <Route path="/admin/sellers" element={<ManageSellers />} /> */}
              </>
            )}

            {/* If non-admin tries: redirect */}
            {!isAdmin && (
              <Route path="/admin/*" element={<Navigate to="/" replace />} />
            )}
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
