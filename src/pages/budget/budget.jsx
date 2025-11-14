import React, { useEffect, useState } from "react";
import { Box, Grid, Paper, Typography, Button, IconButton, Tooltip, Stack, List, ListItem, ListItemText, Divider, TextField, Chip, Modal } from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import "../../styles/pages/dashboard/budget-page/budget.scss";
import axios from "axios";
import VisualCard from "./cards/visual-data.jsx";
import ProjectionsCard from "./cards/projections.jsx";
import FinancialCalendar from "../budget/WeeklyOverview.jsx";
import TransactionCard from "./cards/transactions.jsx";
import EditTransactions from "./popups/edit-transactions.jsx";
import ManageBudgets from "./popups/man-budget.jsx";
import EditAccounts from "./popups/edit-acc.jsx";
import { useNavigate } from "react-router-dom";


const QuickAccess = ({ onEditTransactions, onManageBudgets, onEditAccounts }) => {
  return (
    <div className="header-quick-access">
      <Tooltip title="Edit Transactions">
        <IconButton onClick={onEditTransactions} size="small" aria-label="edit-transactions">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="currentColor"/></svg>
        </IconButton>
      </Tooltip>
      <Tooltip title="Manage Budgets">
        <IconButton onClick={onManageBudgets} size="small" aria-label="manage-budgets">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L2 9l10 6 10-6-10-6zm0 8.5L4.21 9 12 5.5 19.79 9 12 11.5zM2 17l10 6 10-6v-2l-10 6-10-6v2z" fill="currentColor"/></svg>
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit Accounts">
        <IconButton onClick={onEditAccounts} size="small" aria-label="edit-accounts">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" fill="currentColor"/></svg>
        </IconButton>
      </Tooltip>
    </div>
  );
}

const MyAccounts = ({ refreshTrigger = 0 }) => {
  const [balances, setBalances] = useState({
    checking: { balance_amount: 0, previous_balance: 0 },
    savings: { balance_amount: 0, previous_balance: 0 },
    cash: { balance_amount: 0, previous_balance: 0 }
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const token = localStorage.getItem("token");
        
        const response = await axios.get("http://localhost:8000/user_balances/", {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        const data = response.data;
        console.log("Unified balance response:", data);
        
        if (data.has_plaid && data.plaid_balances.length > 0) {
          // Handle Plaid users - aggregate balances by type
          const checking = data.plaid_balances.filter(acc => acc.subtype === "checking")
            .reduce((sum, acc) => sum + (acc.balance || 0), 0);
          const savings = data.plaid_balances.filter(acc => acc.subtype === "savings")
            .reduce((sum, acc) => sum + (acc.balance || 0), 0);

          const balancesObj = {
            checking: { balance_amount: checking, previous_balance: 0 },
            savings: { balance_amount: savings, previous_balance: 0 },
            cash: { balance_amount: data.cash_balance || 0, previous_balance: 0 }
          };
          
          setBalances(balancesObj);
          console.log("Successfully loaded Plaid balances");
        } else {
          // Handle manual users - use manual_balances from response
          const balancesObj = {
            checking: { balance_amount: data.manual_balances.checking || 0, previous_balance: 0 },
            savings: { balance_amount: data.manual_balances.savings || 0, previous_balance: 0 },
            cash: { balance_amount: data.manual_balances.cash || data.cash_balance || 0, previous_balance: 0 }
          };
          
          setBalances(balancesObj);
          console.log("Successfully loaded manual balances:", balancesObj);
        }
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.error("Unauthorized: Redirecting to login.");
          alert("Your session has expired. Please log in again.");
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          console.error("Error fetching balances:", error);
          // Set default values on error
          const defaultBalances = {
            checking: { balance_amount: 0, previous_balance: 0 },
            savings: { balance_amount: 0, previous_balance: 0 },
            cash: { balance_amount: 0, previous_balance: 0 }
          };
          setBalances(defaultBalances);
          console.log("Using default balances due to error");
        }
      }
    };

    fetchBalances();
  }, [navigate, refreshTrigger]);

  return (
    <Box className="card-content">
      <Box className="card-body">
        <List dense>
          {Object.entries(balances).map(([accountType, data]) => (
            <React.Fragment key={accountType}>
              <ListItem>
                <ListItemText
                  primary={accountType.charAt(0).toUpperCase() + accountType.slice(1)}
                  secondary={`$${(data.balance_amount || 0).toFixed(2)}`}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Box>
    </Box>
  );
};

// EditAccountsModal component for unified account editing
const EditAccountsModal = ({ open, onClose, userPlaidStatus, currentBalances }) => {
  const [editedBalances, setEditedBalances] = useState({
    checking: currentBalances.checking.balance_amount.toString(),
    savings: currentBalances.savings.balance_amount.toString(),
    cash: currentBalances.cash.balance_amount.toString()
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      
      // Only update editable balances
      const updates = [];
      
      if (userPlaidStatus.balancesEditable.checking) {
        updates.push({ balance_name: 'checking', new_amount: parseFloat(editedBalances.checking) });
      }
      if (userPlaidStatus.balancesEditable.savings) {
        updates.push({ balance_name: 'savings', new_amount: parseFloat(editedBalances.savings) });
      }
      if (userPlaidStatus.balancesEditable.cash) {
        updates.push({ balance_name: 'cash', new_amount: parseFloat(editedBalances.cash) });
      }

      // Use the new manual balance update endpoint
      for (const update of updates) {
        await axios.put(
          "http://localhost:8000/user_balances/manual_balance_update/",
          update,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
      }
      
      onClose(); // This will trigger refresh
    } catch (error) {
      console.error("Error updating balances:", error);
      alert("Failed to update balances. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 24,
        p: 4,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Edit Account Balances</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {userPlaidStatus.hasPlaid && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Checking and Savings accounts are connected via Plaid and are read-only.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              Checking Account
              {userPlaidStatus.hasPlaid && (
                <Chip label="Plaid" size="small" color="primary" variant="outlined" />
              )}
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={editedBalances.checking}
              onChange={(e) => setEditedBalances(prev => ({ ...prev, checking: e.target.value }))}
              disabled={!userPlaidStatus.balancesEditable.checking}
              inputProps={{ step: '0.01' }}
            />
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              Savings Account
              {userPlaidStatus.hasPlaid && (
                <Chip label="Plaid" size="small" color="primary" variant="outlined" />
              )}
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={editedBalances.savings}
              onChange={(e) => setEditedBalances(prev => ({ ...prev, savings: e.target.value }))}
              disabled={!userPlaidStatus.balancesEditable.savings}
              inputProps={{ step: '0.01' }}
            />
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Cash
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={editedBalances.cash}
              onChange={(e) => setEditedBalances(prev => ({ ...prev, cash: e.target.value }))}
              disabled={!userPlaidStatus.balancesEditable.cash}
              inputProps={{ step: '0.01' }}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

const CardCarousel = ({ refreshTrigger = 0 }) => {
  const [activeCard, setActiveCard] = useState(0);
  
  const cards = [
    {
      title: "My Accounts",
      component: <MyAccounts refreshTrigger={refreshTrigger} />
    },
    {
      title: "Recent Transactions", 
      component: <TransactionCard />
    },
    {
      title: "Data Analytics",
      component: <VisualCard />
    }
  ];

  const nextCard = () => {
    setActiveCard((prev) => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    setActiveCard((prev) => (prev - 1 + cards.length) % cards.length);
  };

  return (
    <Paper elevation={3} sx={{ 
      p: 0,
      boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12) !important'
    }}>
      <Box sx={{ px: 2, pt: 1, pb: 1 }}>
        <Typography variant="h6">{cards[activeCard].title}</Typography>
      </Box>
      
      <Box sx={{ px: 2, pb: 1 }}>
        {cards[activeCard].component}
      </Box>
      
      <Box sx={{ px: 2, pb: 1, pt: 1, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <IconButton onClick={prevCard} size="small">
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {cards.map((_, index) => (
            <Box
              key={index}
              onClick={() => setActiveCard(index)}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: index === activeCard ? 'primary.main' : 'grey.300',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            />
          ))}
        </Box>
        
        <IconButton onClick={nextCard} size="small">
          <ArrowForwardIosIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};

const Budget = () => {
  const [isEditTransactionsOpen, setIsEditTransactionsOpen] = useState(false);
  const [isManageBudgetsOpen, setIsManageBudgetsOpen] = useState(false);
  const [isEditAccountsOpen, setIsEditAccountsOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // console.log("Budget component is rendering");

  // Function to refresh account balances
  const handleBalanceUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Box sx={{ padding: "20px", width: '100%', maxWidth: '100vw', minHeight: '100vh', overflowX: 'hidden', overflowY: 'auto', boxSizing: 'border-box' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" gutterBottom>Budget Manager</Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <QuickAccess
            onEditTransactions={() => setIsEditTransactionsOpen(true)}
            onManageBudgets={() => setIsManageBudgetsOpen(true)}
            onEditAccounts={() => setIsEditAccountsOpen(true)}
          />
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', maxWidth: 'calc(100vw - 40px)', boxSizing: 'border-box' }}>
        <Paper elevation={3} sx={{ 
          p: 0,
          boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12) !important'
        }}>
          <Box sx={{ px: 2, pt: 1, pb: 1 }}>
            <Typography variant="h6">Financial Calendar</Typography>
          </Box>
          <FinancialCalendar />
        </Paper>

        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            flex: '0 0 300px', 
            minWidth: 0,
            maxWidth: '300px',
            margin: 1
          }}>
            <CardCarousel refreshTrigger={refreshTrigger} />
          </Box>

          <Box sx={{ 
            flex: '1 1 auto',
            minWidth: 0,
            overflow: 'visible',
            margin: 1
          }}>
            <Paper elevation={3} sx={{ 
              p: 0,
              boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12) !important'
            }}>
              <ProjectionsCard />
            </Paper>
          </Box>
        </Box>
      </Box>

      {isEditTransactionsOpen && (
        <EditTransactions onClose={() => setIsEditTransactionsOpen(false)} />
      )}
      {isManageBudgetsOpen && (
        <ManageBudgets onClose={() => setIsManageBudgetsOpen(false)} />
      )}
      {isEditAccountsOpen && (
        <EditAccounts 
          open={isEditAccountsOpen} 
          onClose={() => setIsEditAccountsOpen(false)} 
          onBalanceUpdate={handleBalanceUpdate}
        />
      )}
    </Box>
  )
}

export default Budget;