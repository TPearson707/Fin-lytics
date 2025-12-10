import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Box, Button, TextField, Typography, CircularProgress } from '@mui/material';
import './login.scss';

const LoginBlock = ({ isSigningUp: initialSigningUp, setIsAuthenticated }) => {
    const [isSigningUp, setIsSigningUp] = useState(true);
    const [step, setStep] = useState(1);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [number, setNumber] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
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

        setIsLoading(true);

        try {
            if (isSigningUp) {
                const response = await axios.post("http://localhost:8000/auth/", {
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone_number: number,
                    username: username,
                    password: password,
                });
                console.log("Sign-up successful:", response.data);
            }

            const loginResponse = await axios.post(
                "http://localhost:8000/auth/token",
                new URLSearchParams({
                    username: username,
                    password: password,
                }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );

            console.log("Login successful:", loginResponse.data);
            localStorage.setItem("token", loginResponse.data.access_token);
            setIsAuthenticated(true);
            navigate("/");
        } catch (error) {
            console.error(
                "Authentication error:",
                error.response ? error.response.data : error.message
            );
            
            // use the specific error message from the API, or fall back to a generic message
            let errorMessage = "Authentication failed. Please check your credentials and try again.";
            if (error.response && error.response.data && error.response.data.detail) {
                errorMessage = error.response.data.detail;
            }
            
            alert(errorMessage);
        }
    };

    return (
        <Box className="login-container">
            <Typography variant="h4" component="h1" className="login-title" gutterBottom>
                {isSigningUp ? (step === 1 ? 'Create Account' : 'Complete Sign Up') : 'Welcome Back'}
            </Typography>
            <Typography variant="body1" className="login-subtitle" sx={{ mb: 3, color: 'text.secondary' }}>
                {isSigningUp 
                    ? 'Join Finlytics and take control of your financial future' 
                    : 'Sign in to access your dashboard'}
            </Typography>
            <Box component="form" onSubmit={handleSubmit} className="login-form">
                {isSigningUp && step === 1 && (
                    <>
                        <TextField
                            fullWidth
                            label="First Name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Last Name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Phone Number"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            margin="normal"
                            required
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            sx={{ mt: 2 }}
                            onClick={() => setStep(2)}
                        >
                            Next
                        </Button>
                    </>
                )}
                {isSigningUp && step === 2 && (
                    <>
                        <TextField
                            fullWidth
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Confirm Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            margin="normal"
                            required
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            sx={{ mt: 2 }}
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating Account...' : 'Submit'}
                        </Button>
                        <Button
                            variant="text"
                            color="secondary"
                            fullWidth
                            sx={{ mt: 1 }}
                            onClick={() => setStep(1)}
                            disabled={isLoading}
                        >
                            Back
                        </Button>
                    </>
                )}
                {!isSigningUp && (
                    <>
                        <TextField
                            fullWidth
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            margin="normal"
                            required
                            disabled={isLoading}
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            margin="normal"
                            required
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            fullWidth
                            sx={{ mt: 2 }}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Logging In...' : 'Log In'}
                        </Button>
                    </>
                )}
            </Box>
            <Box className="login-footer">
                {isSigningUp && step === 1 && (
                    <Typography
                        variant="body2"
                        sx={{ 
                            textAlign: 'center', 
                            cursor: isLoading ? 'default' : 'pointer', 
                            color: 'primary.main',
                            opacity: isLoading ? 0.5 : 1,
                            pointerEvents: isLoading ? 'none' : 'auto'
                        }}
                        onClick={() => !isLoading && setIsSigningUp(false)}
                    >
                        Already have an account? <strong>Log In</strong>
                    </Typography>
                )}
                {!isSigningUp && (
                    <Typography
                        variant="body2"
                        sx={{ 
                            textAlign: 'center', 
                            cursor: isLoading ? 'default' : 'pointer', 
                            color: 'primary.main',
                            opacity: isLoading ? 0.5 : 1,
                            pointerEvents: isLoading ? 'none' : 'auto'
                        }}
                        onClick={() => !isLoading && setIsSigningUp(true)}
                    >
                        Don't have an account? <strong>Sign Up</strong>
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default LoginBlock;
