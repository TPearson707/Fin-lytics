import React from "react";
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import { Box, Typography } from "@mui/material";
import PlanCard from "../components/PlanCard";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const Plans = () => {
  const navigate = useNavigate();

  const plans = [
    {
      title: "Plus",
      price: "$9.99/mo",
      features: ["Basic analytics", "Portfolio tracking", "Email alerts"],
    },
    {
      title: "Premium",
      price: "$19.99/mo",
      features: ["All Plus features", "Advanced analytics", "Custom alerts"],
    },
    {
      title: "Stock Legend",
      price: "$49.99/mo",
      features: ["All Premium features", "Real-time data", "AI-based predictions"],
    },
  ];

  const handleSelect = (plan) => {
    // pass plan data to payment
    navigate("payment", { state: { plan } });
  };

  const settings = {
    dots: true,
    arrows: true,
    infinite: true,
    speed: 600,
    slidesToShow: 3,
    slidesToScroll: 1,
    centerMode: true,
    centerPadding: "40px",
    responsive: [
      {
        breakpoint: 1200,
        settings: { slidesToShow: 2 },
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 1 },
      },
    ],
  };

  return (
    <Box sx={{ textAlign: "center", mt: 8 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Choose Your Plan!
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Upgrade your Fin-lytics experience with more data, insights, and smarter analytics.
      </Typography>

      <Box
        sx={{
          width: "85%",
          maxWidth: "1200px",
          margin: "0 auto",
          ".slick-slide": {
            display: "flex !important",
            justifyContent: "center",
            alignItems: "center",
          },
          ".slick-slide > div": {
            width: "300px",
          },
        }}
      >
        <Slider {...settings}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.title}
              title={plan.title}
              price={plan.price}
              features={plan.features}
              onSelect={() => handleSelect(plan)}
            />
          ))}
        </Slider>
      </Box>
    </Box>
  );
};

export default Plans;
