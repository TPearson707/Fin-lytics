import React, { useState } from 'react';
import "./intropage.scss";
import LoginBlock from './login';
// import DemoBlock from "./demo";

const Intropage = ({setIsAuthenticated}) => {
    const [showLogin, setShowLogin] = useState(false);
    const [isSigningUp, setIsSigningUp] = useState(false);

    // Function to toggle visibility of the login block
    const toggleLoginBlock = (signingUp = true) => {
        setIsSigningUp(signingUp);
        setShowLogin(true);
    };

    return (
        <div className="intropage">
            <section className="hero-section">
                <h1 className="intro-text">
                    Finlytics - The Future of Finance, Engineered by Students.
                </h1>
                <p className="description-text">
                    Your first step to mastering your finances. Invest, save, and grow wealth using AI-driven insights.
                </p>
                <button className="signup-button" onClick={() => toggleLoginBlock(true)}>
                    Sign Up for Free
                </button>
                <a href="#" className="signin-button" onClick={() => toggleLoginBlock(false)}>
                    Already have an account? Sign in here.
                </a>
            </section>

            {showLogin && (
                <div className="overlay">
                    <div className="login-overlay">
                        <LoginBlock toggleLoginBlock={() => setShowLogin(false)} isSigningUp={isSigningUp} setIsAuthenticated={setIsAuthenticated}/>                    
                        {/* <LoginBlock setIsAuthenticated={setIsAuthenticated} /> */}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Intropage;
