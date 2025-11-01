import React from "react";
import { Card, CardContent, CardActions, Typography, Button } from "@mui/material";

const PlanCard = ({ title, price, features, onSelect }) => {
  return (
    <Card
      sx={{
        mx: "auto",
        width: 280,
        minHeight: 320,
        borderRadius: 3,
        boxShadow: 4,
        backgroundColor: "background.paper",
        textAlign: "center",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        "&:hover": {
          transform: "scale(1.05)",
          boxShadow: 8,
        },
      }}
    >
      <CardContent>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {title}
        </Typography>

        <Typography
          variant="h6"
          color="primary"
          gutterBottom
          sx={{ fontWeight: 500 }}
        >
          {price}
        </Typography>

        {features.map((feature, index) => (
          <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
            • {feature}
          </Typography>
        ))}
      </CardContent>

      <CardActions sx={{ justifyContent: "center", mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          size="medium"
          sx={{
            borderRadius: "20px",
            px: 4,
            py: 0.8,
            textTransform: "none",
            fontWeight: "bold",
          }}
          onClick={onSelect}
        >
          Select
        </Button>
      </CardActions>
    </Card>
  );
};

export default PlanCard;
