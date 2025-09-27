import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/components/commonnav.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleUser, faBell } from "@fortawesome/free-solid-svg-icons";
import finLogo from "../../assets/finLogo.png";
import axios from "axios";

import Modal from "./modal/modal";
import NotificationBlock from "./modal/notifs";
import SettingsBlock from "./modal/settings/settings";
import LogoutBlock from "./modal/logout";
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AppBar from '@mui/material/AppBar';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const DbNavbar = ({ isAuthenticated, setIsAuthenticated }) => {
    const [user, setUser] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState(null);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token");
        window.location.href = "/login";
    };

    const getUser = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://localhost:8000/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log("Response:", response.data); // debug log, for some reason the response is null for f/l name

            const { first_name, last_name, username, id } = response.data.User;
            setUser({ firstName: first_name, lastName: last_name, username, id });
            console.log(response.data);
        } catch (error) {
            console.error("Error fetching user:", error);
            handleLogout(); // Log the user out if the token is invalid
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            getUser();
        }
    }, [isAuthenticated]);

    const toggleProfileDropdown = () => {
        setIsOpen((prev) => !prev);
        setIsNotifOpen(false);
    };

    const toggleNotifDropdown = () => {
        setIsNotifOpen((prev) => !prev);
        setIsOpen(false);
    };

    const openModal = (contentComponent) => {
        setModalContent(() => contentComponent);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalContent(null);
        setModalOpen(false);
    };

    return (
        <>
            <Box>
                <AppBar position="static" sx={{ backgroundColor: 'white', color: 'black', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <Toolbar>
                        <Link to="/">
                            <img src={finLogo} alt="Logo" style={{ height: '35px', marginRight: '10px', cursor: 'pointer' }} />
                        </Link>
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        </Typography>
                        <Button color="inherit" onClick={toggleNotifDropdown}><NotificationsIcon fontSize="large" sx={{ color: "primary" }}/></Button>
                        <div className="notif-content">
                            {isNotifOpen && <NotificationBlock />}
                        </div>
                        <Button color="inherit" onClick={toggleProfileDropdown}><AccountCircleIcon fontSize="large"/></Button>
                         {isOpen && (
                            <ProfileContent
                                user={user}
                                openModal={openModal}
                                setIsAuthenticated={setIsAuthenticated}
                                navigate={navigate}
                            />
                        )}
                    </Toolbar>
                </AppBar>
            </Box>
        
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        {modalContent && modalContent()}
                        <button className="close-modal" onClick={closeModal}>
                            x
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

const ProfileContent = ({ user, openModal, setIsAuthenticated, navigate }) => {
    return (
        <div className="profile-content">
            <p className="greeting">
                {user ? `Welcome, ${user.firstName}!` : "Welcome!"}
            </p>
            {/* <button onClick={() => openModal(() => <NotificationBlock />)}>Notifications</button> */}
            <button onClick={() => openModal(() => <SettingsBlock />)}>Settings</button>
            <button onClick={() => openModal(() => <LogoutBlock setIsAuthenticated={setIsAuthenticated} navigate={navigate} />)}>Log Out</button>
        </div>
    );
};

export default DbNavbar;