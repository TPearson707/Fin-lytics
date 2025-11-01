import React from "react";
import { Box, Typography, Button } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useNavigate, useLocation } from "react-router-dom";

const Success = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPlan = location.state?.plan;
  const oneTimePayment = location.state?.oneTimePayment;

  const handleReturn = () => navigate("/");

  return (
    <Box
      sx={{
        textAlign: "center",
        mt: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <CheckCircleOutlineIcon
        color="success"
        sx={{ fontSize: 100, mb: 2, animation: "pop 0.4s ease" }}
      />

      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Payment Successful!
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
        {selectedPlan
          ? `Your ${selectedPlan.title} plan is now active.`
          : "Your subscription is now active."}
        {oneTimePayment
          ? " This was a one-time payment — no renewal will occur."
          : " Your subscription will renew automatically each billing cycle."}
      </Typography>

      <Button
        variant="contained"
        color="primary"
        size="large"
        sx={{ borderRadius: "20px", px: 5 }}
        onClick={handleReturn}
      >
        Return to Dashboard
      </Button>

      <style>{`
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </Box>
  );
};

export default Success;
