import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, IconButton, Typography, Box, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddTransactionDialog from './add-transaction';

export default function RecurringChildrenModal({ open, onClose, parent = {}, childrenList = [], onDelete, onEdit }) {
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const openEditor = (child) => {
    setEditTarget(child);
    setEditOpen(true);
  };

  const handleSubmitFromDialog = async (payload) => {
    if (onEdit && editTarget) {
      await onEdit(editTarget, payload);
    }
    setEditOpen(false);
    setEditTarget(null);
  };

  const formatDisplayDate = (d) => {
    if (!d) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-');
      return new Date(y, parseInt(m,10)-1, parseInt(day,10)).toLocaleDateString();
    }
    const dt = new Date(d);
    return dt.toLocaleDateString();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>
          Occurrences for {parent.merchant_name || parent.category || 'Recurring'}
        </DialogTitle>
        <DialogContent>
          {childrenList.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">No occurrences found</Typography>
            </Box>
          ) : (
            <List>
              {childrenList.map(child => (
                <ListItem key={child.transaction_id} divider>
                  <ListItemText
                    primary={child.merchant_name || child.category || 'Recurring'}
                    secondary={formatDisplayDate(child.date)}
                  />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ color: child.amount < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                      ${Math.abs(child.amount).toFixed(2)}
                    </Typography>
                    <IconButton edge="end" aria-label="edit" onClick={() => openEditor(child)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="delete" onClick={() => onDelete && onDelete(child.transaction_id, false)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {editOpen && editTarget && (
        <AddTransactionDialog
          open={editOpen}
          onClose={() => { setEditOpen(false); setEditTarget(null); }}
          initialData={editTarget}
          isEdit={true}
          isChild={true}
          onSubmit={handleSubmitFromDialog}
        />
      )}
    </>
  );
}
