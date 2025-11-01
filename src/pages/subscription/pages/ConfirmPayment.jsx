import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import SummaryCard from "../components/SummaryCard";

const ConfirmPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedPlan = location.state?.plan;
  const paymentData = location.state?.paymentData;

  const handleConfirm = () => {
    if (!selectedPlan) {
      navigate("/plans");
      return;
    }

    console.log("Confirmed payment for:", selectedPlan);
    console.log("Payment data:", paymentData);

    // Pass plan + payment type to success page
    navigate("../success", {
      state: {
        plan: selectedPlan,
        oneTimePayment: paymentData?.oneTimePayment,
      },
    });
  };

  return (
    <Box sx={{ textAlign: "center", mt: 6 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Review & Confirm
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Please review your subscription details before confirming your payment.
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
        <SummaryCard
          plan={selectedPlan}
          oneTimePayment={paymentData?.oneTimePayment}
        />
      </Box>

      <Button
        variant="contained"
        color="primary"
        size="large"
        sx={{ borderRadius: "20px", px: 6 }}
        onClick={handleConfirm}
      >
        Confirm & Pay
      </Button>
    </Box>
  );
};

export default ConfirmPayment;
