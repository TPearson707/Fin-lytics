//this file is the pop-up overlay component, similar to the login popup, but reusable for the dashboard side of things
import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import "../../../styles/components/modal/modal.scss";

const Modal = ({ isOpen, onClose, content }) => {
    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogTitle>Modal</DialogTitle>
            <DialogContent>
                <div className="modal-inner-content">{content}</div>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default Modal;