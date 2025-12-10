import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Paper,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api";

export default function CreateListing() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    version: "1.0.0",
  });
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    try {
      const res = await api.post("/algorithms", {
        title: form.title,
        description: form.description,
        category: form.category,
        price: form.price ? parseFloat(form.price) : null,
        version: form.version,
      });

      navigate(`/marketplace/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create listing.");
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        maxWidth: 700,
        mx: "auto",
        mt: 5,
        borderRadius: 3,
      }}
    >

      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        Create New Algorithm Listing
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        fullWidth
        label="Title"
        value={form.title}
        sx={{ mb: 2 }}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <TextField
        fullWidth
        label="Description"
        multiline
        rows={4}
        sx={{ mb: 2 }}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />

      <TextField
        fullWidth
        select
        label="Category"
        sx={{ mb: 2 }}
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
      >
        <MenuItem value="Machine Learning">Machine Learning</MenuItem>
        <MenuItem value="Scalping">Scalping</MenuItem>
        <MenuItem value="Swing Trading">Swing Trading</MenuItem>
        <MenuItem value="Crypto">Crypto</MenuItem>
        <MenuItem value="Other">Other</MenuItem>
      </TextField>

      <TextField
        fullWidth
        label="Price (optional)"
        type="number"
        sx={{ mb: 2 }}
        value={form.price}
        onChange={(e) => setForm({ ...form, price: e.target.value })}
      />

      <TextField
        fullWidth
        label="Version"
        value={form.version}
        sx={{ mb: 3 }}
        onChange={(e) => setForm({ ...form, version: e.target.value })}
      />

      <Button fullWidth variant="contained" onClick={handleSubmit}>
        Create Listing
      </Button>
    </Paper>
  );
}