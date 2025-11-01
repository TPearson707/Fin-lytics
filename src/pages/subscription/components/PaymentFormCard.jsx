import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  Grid,
  Box,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

const PaymentFormCard = ({ selectedPlan, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    oneTimePayment: false,
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  // ---- Input Change Handler ----
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = value;

    // --- Card Number Formatting ---
    if (name === "cardNumber") {
      // remove non-digits
      newValue = newValue.replace(/\D/g, "");
      // limit to 16 digits
      newValue = newValue.slice(0, 16);
      // insert spaces every 4 digits
      const parts = [];
      for (let i = 0; i < newValue.length; i += 4) {
        parts.push(newValue.slice(i, i + 4));
      }
      newValue = parts.join(" ");
    }

    // --- Expiry Formatting ---
    if (name === "expiry") {
      // remove non-digits
      newValue = newValue.replace(/\D/g, "");
      // limit to 4 digits total (MMYY)
      newValue = newValue.slice(0, 4);
      // auto-insert slash after MM
      if (newValue.length > 2) {
        newValue = `${newValue.slice(0, 2)}/${newValue.slice(2)}`;
      }
    }

    // --- CVV ---
    if (name === "cvv") {
      newValue = newValue.replace(/\D/g, "").slice(0, 3);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : newValue,
    }));

    setErrors((prev) => ({ ...prev, [name]: false }));
    setErrorMessage("");
  };

  // ---- Validation ----
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = true;
    if (!formData.cardNumber.trim()) newErrors.cardNumber = true;
    if (!formData.expiry.trim()) newErrors.expiry = true;
    if (!formData.cvv.trim()) newErrors.cvv = true;

    const cleanCard = formData.cardNumber.replace(/\s/g, "");
    const cardRegex = /^\d{16}$/;
    if (cleanCard && !cardRegex.test(cleanCard)) newErrors.cardNumber = true;

    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (formData.expiry && !expiryRegex.test(formData.expiry)) newErrors.expiry = true;

    const cvvRegex = /^\d{3}$/;
    if (formData.cvv && !cvvRegex.test(formData.cvv)) newErrors.cvv = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setErrorMessage("Missing or invalid required fields.");
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      if (onSubmit) onSubmit(formData);
    }
  };

  // ---- UI ----
  return (
    <Card
      sx={{
        mx: "auto",
        width: 400,
        borderRadius: 3,
        boxShadow: 4,
        backgroundColor: "background.paper",
        textAlign: "center",
      }}
    >
      <CardContent>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Payment Details
        </Typography>

        {selectedPlan && (
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            You’re subscribing to:{" "}
            <strong>{selectedPlan.title}</strong> — {selectedPlan.price}
          </Typography>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Name on Card"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                helperText={errors.name ? "Enter a valid name" : ""}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Card Number"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleChange}
                inputProps={{ maxLength: 19 }}
                error={errors.cardNumber}
                helperText={errors.cardNumber ? "Enter a valid 16-digit card number" : ""}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                required
                label="Expiry (MM/YY)"
                name="expiry"
                value={formData.expiry}
                onChange={handleChange}
                inputProps={{ maxLength: 5 }}
                error={errors.expiry}
                helperText={errors.expiry ? "Enter valid date e.g. 08/26" : ""}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                required
                label="CVV"
                name="cvv"
                type="password"
                value={formData.cvv}
                onChange={handleChange}
                inputProps={{ maxLength: 3 }}
                error={errors.cvv}
                helperText={errors.cvv ? "Enter 3-digit CVV" : ""}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.oneTimePayment}
                    onChange={handleChange}
                    name="oneTimePayment"
                    color="primary"
                  />
                }
                label="Make this a one-time payment"
              />
            </Grid>
          </Grid>
        </Box>
      </CardContent>

      {errorMessage && (
        <Typography
          color="error"
          variant="body2"
          sx={{ mt: -1, mb: 1, textAlign: "center", fontWeight: 500 }}
        >
          {errorMessage}
        </Typography>
      )}

      <CardActions sx={{ justifyContent: "center", mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          type="submit"
          sx={{ borderRadius: "20px", px: 4 }}
          onClick={handleSubmit}
        >
          Pay Now
        </Button>
      </CardActions>
    </Card>
  );
};

export default PaymentFormCard;
