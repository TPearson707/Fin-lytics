import React from "react";
import { Box, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import PaymentFormCard from "../components/PaymentFormCard";

const PaymentForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPlan = location.state?.plan;

  const handlePaymentSubmit = (formData) => {
    if (!selectedPlan) {
      console.error("No plan selected");
      navigate("/plans");
      return;
    }

    // Pass plan + payment data forward
    navigate("/plans/confirm", {
      state: { plan: selectedPlan, paymentData: formData },
    });
  };

  return (
    <Box sx={{ textAlign: "center", mt: 6 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Complete Your Payment
      </Typography>

      <Box sx={{ mt: 4 }}>
        <PaymentFormCard
          selectedPlan={selectedPlan}
          onSubmit={handlePaymentSubmit}
        />
      </Box>
    </Box>
  );
};

export default PaymentForm;
