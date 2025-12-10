import React from 'react';
import { Paper, Box, Typography, Divider, List, ListItem, Link } from '@mui/material';

export default function News({ news }) {
  if (!news || news.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">No news available.</Typography>
      </Paper>
    );
  }

  const topStory = news[0];
  const additionalStories = news.slice(1, 5);

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>News Feed & Stock-AI Insights</Typography>
      <Divider sx={{ mb: 2 }} />

      {/* Highlighted top story */}
      <Box sx={{ mb: 2, background: 'rgba(240,248,255,0.5)', borderRadius: 2, p: 2 }}>
        <Link href={topStory.url} target="_blank" rel="noopener" underline="hover">
          <Typography variant="subtitle1" color="primary" fontWeight="bold">
            {topStory.title}
          </Typography>
        </Link>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {topStory.site} · {new Date(topStory.publishedDate).toLocaleDateString()}
        </Typography>
        {topStory.description && (
          <Typography variant="body2" color="text.primary" sx={{ fontStyle: 'italic' }}>
            {topStory.description}
          </Typography>
        )}
      </Box>

      {/* Additional stories */}
      <List dense>
        {additionalStories.map((n, idx) => (
          <ListItem key={idx} disableGutters sx={{ mb: 1 }}>
            <Box sx={{ width: '100%' }}>
              <Link href={n.url} target="_blank" rel="noopener" underline="hover" color="text.primary">
                <Typography variant="body2" fontWeight={600}>{n.title}</Typography>
              </Link>
              <Typography variant="caption" color="text.secondary">
                {n.site} · {new Date(n.publishedDate).toLocaleDateString()}
              </Typography>
              {n.description && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {n.description}
                </Typography>
              )}
            </Box>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
