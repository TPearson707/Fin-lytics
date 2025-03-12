import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import './login.scss';

const LoginBlock = ({ toggleLoginBlock, isSigningUp: initialSigningUp, setIsAuthenticated }) => {
    const [isSigningUp, setIsSigningUp] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [number, setNumber] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        setIsSigningUp(initialSigningUp);
    }, [initialSigningUp]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSigningUp && password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {
            if (isSigningUp) {
                const response = await axios.post("http://localhost:8000/auth/", {
                    username: email,
                    phone_number: number,
                    password: password,
                });
                console.log("Sign-up successful:", response.data);
            }
            
            // Login (either after signup or direct sign-in)
            const loginResponse = await axios.post(
                "http://localhost:8000/auth/token",
                new URLSearchParams({
                    username: email,
                    password: password,
                }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );

            console.log("Login successful:", loginResponse.data);
            localStorage.setItem("token", loginResponse.data.access_token);
            setIsAuthenticated(true);
            navigate("/dashboard");
        } catch (error) {
            console.error("Authentication error:", error.response ? error.response.data : error.message);
            alert("Authentication failed. Please check your credentials and try again.");
        }
    };

    return (
        <div className='login-block'>
            <div className="login">
                <button className="close-btn" onClick={toggleLoginBlock}>x</button>
                <h2>{isSigningUp ? 'Sign Up' : 'Log In'}</h2>
                
                <div className={`login-container ${isSigningUp ? 'expanded' : 'collapsed'}`}>
                    <form onSubmit={handleSubmit}>
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        {isSigningUp && (
                            <input type="tel" placeholder="Phone Number" value={number} onChange={(e) => setNumber(e.target.value)} required />
                        )}
                        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        {isSigningUp && (
                            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                        )}
                        <button type="submit" className='submit-btn'>{isSigningUp ? 'Sign Up' : 'Sign In'}</button>
                    </form>
                </div>

                <p onClick={() => setIsSigningUp(!isSigningUp)} className="toggle-text">
                    {isSigningUp ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
                </p>
            </div>
        </div>
    );
};

export default LoginBlock;
