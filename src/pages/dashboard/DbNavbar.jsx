import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./DbNav.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleUser, faAngleDown } from "@fortawesome/free-solid-svg-icons";
import finLogo from "../../assets/finLogo.png";
import axios from "axios";

import Modal from "../../components/popups/modal";
import NotificationBlock from "../../components/popups/notifs";
import SettingsBlock from "../../components/popups/settings/settings";

const DbNavbar = ({ isAuthenticated, setIsAuthenticated }) => {
    const [user, setUser] = useState(null);
    const [isOpen, setIsOpen] = useState(false); // Controls profile dropdown visibility
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState(null);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        navigate("/");
    };

    const getUser = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://localhost:8000/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

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

    const toggleDropdown = () => {
        setIsOpen((prev) => !prev);
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
                        hello
                    </ul>
                </div>
                <div className="nav-right">
                    <div className="profilebtn-container">
                        <button className="profilebtn" onClick={toggleDropdown}>
                            {/* {user && <span className="profile-icon-text">{user.firstName}</span>} */}
                            <FontAwesomeIcon icon={faCircleUser} size="2xl" />
                        </button>
                        {isOpen && (
                            <ProfileContent
                                user={user}
                                openModal={openModal}
                                handleLogout={handleLogout}
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
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

const ProfileContent = ({ user, openModal, handleLogout }) => {
    return (
        <div className="profile-content">
            <button onClick={() => openModal(() => <NotificationBlock />)}>Notifications</button>
            <button onClick={() => openModal(() => <SettingsBlock />)}>Settings</button>
            <button className="logout" onClick={handleLogout}>Log Out</button>
        </div>
    );
};

export default DbNavbar;