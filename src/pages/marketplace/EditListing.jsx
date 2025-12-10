import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TextField, Button, Paper, Typography, Alert } from "@mui/material";
import api from "../../api";

export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    loadListing();
  }, []);

  async function loadListing() {
    try {
      const res = await api.get(`/algorithms/${id}`);
      setForm(res.data);
    } catch {
      setError("Failed to load listing.");
    }
  }

  async function handleSave() {
    try {
      await api.put(`/algorithms/${id}`, {
        title: form.title,
        description: form.description,
        category: form.category,
        price: form.price,
        version: form.version
      });

      navigate(`/marketplace/${id}`);
    } catch (err) {
      setError("Failed to update listing.");
    }
  }

  if (!form?.title) return <Typography sx={{ mt: 4, textAlign: "center" }}>Loading...</Typography>;

  return (
    <Paper sx={{ maxWidth: 700, mx: "auto", mt: 5, p: 4 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Edit Listing</Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        fullWidth
        label="Title"
        sx={{ mb: 2 }}
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
      />

      <TextField
        fullWidth
        label="Description"
        multiline
        rows={4}
        sx={{ mb: 2 }}
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
      />

      <TextField
        fullWidth
        label="Category"
        sx={{ mb: 2 }}
        value={form.category}
        onChange={e => setForm({ ...form, category: e.target.value })}
      />

      <TextField
        fullWidth
        label="Price"
        sx={{ mb: 3 }}
        type="number"
        value={form.price}
        onChange={e => setForm({ ...form, price: e.target.value })}
      />

      <Button fullWidth variant="contained" onClick={handleSave}>
        Save Changes
      </Button>
    </Paper>
  );
}