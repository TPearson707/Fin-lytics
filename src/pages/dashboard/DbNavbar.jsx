import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./DbNav.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleUser, faBell } from "@fortawesome/free-solid-svg-icons";
import finLogo from "../../assets/finLogo.png";
import axios from "axios";

import Modal from "../../components/popups/modal";
import NotificationBlock from "../../components/popups/notifs";
import SettingsBlock from "../../components/popups/settings/settings";
import LogoutBlock from "../../components/popups/logout";

const DbNavbar = ({ isAuthenticated, setIsAuthenticated }) => {
    const [user, setUser] = useState(null);
    const [isOpen, setIsOpen] = useState(false); 
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState(null);
    const navigate = useNavigate();

    // const handleLogout = () => {
    //     localStorage.removeItem("token");
    //     setIsAuthenticated(false);
    //     navigate("/");
    // };

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
            <div className="navbar">
                <div className="nav-left">
                    <Link to="/"><img src={finLogo} alt="Logo" className="logo" /></Link>
                </div>
                <div className="nav-mid">
                    <ul>
                        {/* hello */}
                    </ul>
                </div>
                <div className="nav-right">
                    <div className="notif-container">
                        <button className="notifbtn" onClick={toggleNotifDropdown}>
                            <FontAwesomeIcon icon={faBell} size="2xl" />
                        </button>
                        <div className="notif-content">
                            {isNotifOpen && <NotificationBlock />}
                        </div>
                    </div>

                    <div className="profilebtn-container">
                        <button className="profilebtn" onClick={toggleProfileDropdown}>
                            {/* {user && <span className="profile-icon-text">{user.firstName}</span>} */}
                            <FontAwesomeIcon icon={faCircleUser} size="2xl" />
                        </button>
                        {isOpen && (
                            <ProfileContent
                                user={user}
                                openModal={openModal}
                                setIsAuthenticated={setIsAuthenticated}
                                navigate={navigate}
                            />
                        )}
                    </div>
                </div>
            </div>
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