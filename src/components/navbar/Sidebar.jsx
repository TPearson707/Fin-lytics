import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faCircleUser, faAngleDown } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
// import miniLogo from "../../assets/miniLogo.png";

// importing modal content
import Modal from "../popups/modal";
// import NotificationBlock from "../popups/notifs";
// import LogoutBlock from "../popups/logout";
// import SettingsBlock from "../popups/settings/settings";

import "./sidebar.scss";

const Sidebar = ({ setIsAuthenticated }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState(null);
    const [user, setUser] = useState(null);

    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token"); // Remove token from localStorage
        setIsAuthenticated(false); // Update authentication state
        navigate("/"); // Redirect to login or homepage
    };

    const getUser = async () => {
        if (setIsAuthenticated) {
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
            }
        } else {
            console.log("Could not get user, user is unauthorized");
        }
    };

    useEffect(() => {
        if (setIsAuthenticated) {
            getUser();
        }
    }, [setIsAuthenticated]);

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
            <div className="sidebar">
                <div className="sidebar-content">
                    {/* <div className="side-logo">
                        <Link to="/"><img src={miniLogo} alt="MiniLogo" /></Link>
                    </div> */}
                    <MenuContainer />
                </div>
                {/* <ProfileDropdown user={user} openModal={openModal} handleLogout={handleLogout} /> */}
            </div>
            {isModalOpen && (
                <div className="modal-overlay">
                    <Modal isOpen={isModalOpen} onClose={closeModal} content={modalContent ? modalContent() : null} />
                </div>
            )}
        </>
    );
};

const MenuContainer = () => (
    <div className="menu-container">
        <ul>
            <li><Link to="/">Overview</Link></li>
            <li><Link to="/Stock">Stock AI</Link></li>
            <li><Link to="/portfolio">Portfolio</Link></li>
            <li><Link to="/Budget">Budgeter</Link></li>
        </ul>
    </div>
);

// const ProfileDropdown = ({ user, openModal, handleLogout }) => {
//     const [isOpen, setIsOpen] = useState(false);

//     const handleProfileClick = () => {
//         setIsOpen((prev) => !prev);
//     };

//     return (
//         <div className="side-bot">
//             <div className="profile-drop">
//                 <button className="profile-button" onClick={handleProfileClick}>
//                     <FontAwesomeIcon icon={faCircleUser} size="2xl" />
//                     {user && <span className="profile-icon-text">{user.firstName}</span>}
//                     <FontAwesomeIcon icon={faAngleDown} className="arrow" />
//                 </button>
//                 {isOpen && <ProfileContent user={user} openModal={openModal} handleLogout={handleLogout} />}
//             </div>
//         </div>
//     );
// };

// const ProfileContent = ({ user, openModal, handleLogout }) => {
//     return (
//         <div className="profile-content">
//             <button onClick={() => openModal(() => <NotificationBlock />)}>Notifications</button>
//             <button onClick={() => openModal(() => <SettingsBlock />)}>Settings</button>
//             <button className="logout" onClick={handleLogout}>Log Out</button>
//         </div>
//     );
// };

export default Sidebar;
