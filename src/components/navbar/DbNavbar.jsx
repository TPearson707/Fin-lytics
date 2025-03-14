import { useState, useEffect} from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleUser, faAngleLeft, faAngleRight, faAngleDown } from "@fortawesome/free-solid-svg-icons";
import miniLogo from "../../assets/miniLogo.png";

//importing modal content
import Modal from "../popups/modal"
import NotificationBlock from "../popups/notifs";
import LogoutBlock from "../popups/logout";
import SettingsBlock from "../popups/settings/settings";

import "./sidebar.scss";

const user = { name: "Lilly" }; // set user name

const DbNavbar = ({setIsAuthenticated}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState(null);

    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token"); // Remove token from localStorage
        setIsAuthenticated(false); // Update authentication state
        navigate("/"); // Redirect to login or homepage
      };
    
    const openModal = (contentComponent) => {
        setModalContent(() => contentComponent);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalContent(null);
        setModalOpen(false);
    };

    const toggleSidebar = () => {
        setIsExpanded((prev) => !prev);
    };

    return (
        <>
        <div className={`sidebar ${isExpanded ? "expanded" : "collapsed"}`}>
            <div className="sidebar-content">
                <div className="side-logo">
                    <Link to="/"><img src={miniLogo} alt="MiniLogo" /></Link>
                </div>

                <HamburgerContent isExpanded={isExpanded} toggleSidebar={toggleSidebar}/>
                <MenuContainer isExpanded={isExpanded} toggleSidebar={toggleSidebar}/>
            </div>

            <ProfileDropdown user={user} isExpanded={isExpanded} toggleSidebar={toggleSidebar} openModal={openModal} handleLogout={handleLogout}/>

        </div>
        
        {isModalOpen && (
            <div className="modal-overlay">
                <Modal isOpen={isModalOpen} onClose={closeModal} content={modalContent ? modalContent() : null} />
            </div>
        )}
        {/* render in modal */}

        <CollapseButton isExpanded={isExpanded} toggleSidebar={toggleSidebar}/> 
        {/* will hover outside of the bar when it is expanded, less conflict with dashboard contents */}
   
        </>
        
    );
};

// hamburger button
const HamburgerContent = ({ isExpanded, toggleSidebar }) => (
    <button 
        className={`hamburger ${isExpanded ? "active" : ""}`} 
        onClick={toggleSidebar}
    >
        <div className={`bun1 ${isExpanded ? "active" : ""}`}></div>
        <div className={`bun2 ${isExpanded ? "active" : ""}`}></div>
        <div className={`bun3 ${isExpanded ? "active" : ""}`}></div>
    </button>
);

// menu content
const MenuContainer = ({ isExpanded, toggleSidebar}) => (
    <div className={`menu-container ${isExpanded ? "expanded" : "collapsed"}`}>
        <ul>
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/jobtrack">AI Portfolio</Link></li>
        </ul>
    </div>
);

//the profile icon button logic
const ProfileDropdown = ({ user, isExpanded, toggleSidebar, openModal, handleLogout}) => {
    const [isOpen, setIsOpen] = useState(false);

    // close profile content when sidebar is collapsed
    useEffect(() => {
        if (!isExpanded) {
            setIsOpen(false);
        }
    }, [isExpanded]);

    const handleProfileClick = () => {
        if (!isExpanded) {
            toggleSidebar(); // expand sidebar
            // setIsOpen(true); // open profile content
        } else {
            setIsOpen((prev) => !prev); // toggle profile content
        }
    };

    return (
        <div className="side-bot">
            <div className="profile-drop">
                <button className="profile-button" onClick={handleProfileClick}>
                    <FontAwesomeIcon icon={faCircleUser} size="2xl" />
                    {isExpanded && <span className="profile-icon-text">{user.name}</span>}
                    {isExpanded && isOpen && <FontAwesomeIcon icon={faAngleDown} className="arrow" />}
                </button>
                {isExpanded && isOpen && (
                    <ProfileContent user={user} openModal={openModal} handleLogout={handleLogout}/>
                )}                {/* must hand openModal to the profile content so that it can actually open it */}
            </div>
        </div>
    );
};

// profile content inside the button, this is now a function rather than component
const ProfileContent = ({ user, openModal, handleLogout}) => { // Add openModal
    // if (!isExpanded) return null;

    return (
        <div className="profile-content">
            <button onClick={() => openModal(() => <NotificationBlock />)}>Notifications</button>
            <button onClick={() => openModal(() => <SettingsBlock />)}>Settings</button>
            <button className="logout" onClick={handleLogout}>Log Out</button>

        </div>
    );
};



//button to close sidebar
const CollapseButton = ({isExpanded, toggleSidebar}) => (
    <button 
        className={`collapse-button ${isExpanded ? "visible" : "hidden"}`} 
        onClick={toggleSidebar}
        aria-label="Toggle Sidebar via closeBar"
    >
        <FontAwesomeIcon icon={isExpanded ? faAngleLeft : faAngleRight}/>
     </button>
);

export default DbNavbar;
