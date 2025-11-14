import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Link,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import axios from "axios";

const RecentNewsCard = ({ ticker }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ticker) return;
    const fetchNews = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`http://127.0.0.1:8000/stocks/news/${ticker}`);
        setArticles(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load news");
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [ticker]);

  return (
    <Paper
      elevation={3}
      sx={{
        flex: 1,
        p: 3,
        border: "1px solid #dcdcdc",
        borderRadius: 2,
        backgroundColor: "#fafafa",
        minHeight: 280,
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Recent News
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress size={30} />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : articles.length > 0 ? (
        <List dense disablePadding>
          {articles.map((a, i) => (
            <React.Fragment key={i}>
              <ListItem alignItems="flex-start" disableGutters>
                <ListItemText
                  primary={
                    <Link
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="hover"
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    >
                      {a.title}
                    </Link>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {a.site} • {new Date(a.publishedDate).toLocaleDateString()}
                    </Typography>
                  }
                />
              </ListItem>
              {i < articles.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      ) : (
        <Typography>No recent news found.</Typography>
      )}
    </Paper>
  );
};

export default RecentNewsCard;
