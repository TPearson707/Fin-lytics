import React from "react";
import { Card, CardContent, Typography, Divider, Box } from "@mui/material";

const SummaryCard = ({ plan, oneTimePayment }) => {
  const summary = plan || {
    title: "Premium",
    price: "$19.99/mo",
    features: ["Advanced analytics", "Priority support", "Custom alerts"],
  };

  return (
    <Card
      sx={{
        mx: "auto",
        width: 350,
        borderRadius: 3,
        boxShadow: 4,
        backgroundColor: "background.paper",
        textAlign: "center",
        p: 2,
      }}
    >
      <CardContent>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Subscription Summary
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          {summary.title}
        </Typography>

        <Typography variant="subtitle1" color="primary" gutterBottom>
          {summary.price}
        </Typography>

        <Box sx={{ mt: 2 }}>
          {summary.features.map((feature, index) => (
            <Typography key={index} variant="body2">
              • {feature}
            </Typography>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" color="text.secondary">
          {oneTimePayment
            ? "One-time payment — no renewal"
            : "Next billing date: Jan 1, 2026"}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
