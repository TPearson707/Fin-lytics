import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Box, Button, TextField, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const LoginBlock = ({ toggleLoginBlock, isSigningUp: initialSigningUp, setIsAuthenticated }) => {
    const [isSigningUp, setIsSigningUp] = useState(true);
    const [step, setStep] = useState(1); // Step state for multi-page signup
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [number, setNumber] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
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
            navigate("/dashboard");
        } catch (error) {
            console.error(
                "Authentication error:",
                error.response ? error.response.data : error.message
            );
            alert("Authentication failed. Please check your credentials and try again.");
        }
    };

    return (
        <Box
            sx={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 400,
                bgcolor: 'background.paper',
                boxShadow: 24,
                p: 4,
                borderRadius: 2,
            }}
        >
            <IconButton
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={toggleLoginBlock}
            >
                <CloseIcon />
            </IconButton>
            <Typography variant="h5" component="h2" gutterBottom>
                {isSigningUp ? (step === 1 ? 'Sign Up' : 'Make your Account') : 'Log In'}
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
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
                        >
                            Submit
                        </Button>
                        <Button
                            variant="text"
                            color="secondary"
                            fullWidth
                            sx={{ mt: 1 }}
                            onClick={() => setStep(1)}
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
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            fullWidth
                            sx={{ mt: 2 }}
                        >
                            Log In
                        </Button>
                    </>
                )}
            </Box>
            {isSigningUp && step === 1 && (
                <Typography
                    variant="body2"
                    sx={{ mt: 2, textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => setIsSigningUp(false)}
                >
                    Already have an account? Log In
                </Typography>
            )}
        </Box>
    );
};

export default LoginBlock;
