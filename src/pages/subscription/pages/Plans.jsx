import React from "react";
import Slider from "react-slick";
import { Box, Typography, Card, CardContent, CardActions, Button } from "@mui/material";

const Plans = () => {
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

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    centerMode: true,
    centerPadding: "60px",
    adaptiveHeight: true,
  };

  return (
    <Box sx={{ textAlign: "center", mt: 6 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Choose Your Plan!
      </Typography>

      <Box sx={{ width: "80%", margin: "0 auto", mt: 4 }}>
        <Slider {...settings}>
          {plans.map((plan) => (
            <Card
              key={plan.title}
              sx={{
                mx: 2,
                borderRadius: 3,
                boxShadow: 4,
                backgroundColor: "background.paper",
                textAlign: "center",
              }}
            >
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {plan.title}
                </Typography>
                <Typography variant="h6" color="primary" gutterBottom>
                  {plan.price}
                </Typography>
                {plan.features.map((f, i) => (
                  <Typography variant="body2" key={i}>
                    • {f}
                  </Typography>
                ))}
              </CardContent>
              <CardActions sx={{ justifyContent: "center", mb: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ borderRadius: "20px", px: 4 }}
                >
                  Select
                </Button>
              </CardActions>
            </Card>
          ))}
        </Slider>
      </Box>
    </Box>
  );
};

export default Plans;
