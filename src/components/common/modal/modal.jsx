//this file is the pop-up overlay component, similar to the login popup, but reusable for the dashboard side of things
import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import "../../../styles/components/modal/modal.scss";

const Modal = ({ isOpen, onClose, content, title = "Modal" }) => {
    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="md">
            <Box sx={{ position: 'relative' }}>
                <DialogTitle sx={{ pr: 6 }}>{title}</DialogTitle>
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: '#666',
                        '&:hover': {
                            color: '#333',
                            backgroundColor: 'rgba(0, 0, 0, 0.04)'
                        }
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </Box>
            <DialogContent>
                <div className="modal-inner-content">{content}</div>
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={onClose} 
                    sx={{ 
                        color: '#666',
                        '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            color: '#333'
                        }
                    }}
                >
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default Modal;