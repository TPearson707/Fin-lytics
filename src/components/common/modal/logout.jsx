// import "./dashboard.scss"

const LogoutBlock = ({setIsAuthenticated, navigate}) => {
    
    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        navigate("/");
    };


    return (
        <div className="logout-block">
            <div className="log-question"> 
                <h2> Confirm Logout </h2> 
                {/* <p> Are you sure you want to log out?</p> */}
            </div>
            <button onClick={handleLogout} className="logout-confirm-btn">Yes, Log Out</button>
        </div>
    )
}

export default LogoutBlock