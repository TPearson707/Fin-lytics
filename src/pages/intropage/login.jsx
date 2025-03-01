import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./login.scss";

const LoginBlock = ({ setIsAuthenticated }) => {
  const [isSigningUp, setIsSigningUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [number, setNumber] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSigningUp && password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      if (isSigningUp) {
        // Sign-up logic
        const response = await axios.post("http://localhost:8000/auth/", {
          username: email, // Assuming email is used as username
          phone_number: number,
          password: password,
        });
        console.log("Sign-up successful:", response.data);
        setIsAuthenticated(true); // Update authentication state
        navigate("/dashboard"); // Navigate to dashboard on successful sign-up
      } else {
        // Sign-in logic
        const response = await axios.post("http://localhost:8000/auth/token", {
          username: email, // Assuming email is used as username
          phone_number: number,
          password: password,
        });
        console.log("Sign-in successful:", response.data);
        localStorage.setItem("token", response.data.access_token); // Store the token in localStorage
        setIsAuthenticated(true);
        navigate("/dashboard"); // Navigate to dashboard on successful sign-in
      }
    } catch (error) {
      console.error(
        "Authentication error:",
        error.response ? error.response.data : error.message
      );

      // Handle specific error for existing user
      if (
        error.response &&
        error.response.status === 400 &&
        error.response.data.detail === "User with this email already exists"
      ) {
        alert(
          "User with this email already exists. Please log in or use a different email."
        );
      } else {
        alert(
          "Authentication failed. Please check your credentials and try again."
        );
      }
    }
  };

  return (
    <div className="login-block">
      <div className="login">
        <h2>{isSigningUp ? "Sign Up" : "Log In"}</h2>

        <div
          className={`login-container ${
            isSigningUp ? "expanded" : "collapsed"
          }`}
        >
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {isSigningUp && (
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            )}
            <button type="submit">{isSigningUp ? "Sign Up" : "Sign In"}</button>
          </form>
        </div>

        <p onClick={() => setIsSigningUp(!isSigningUp)} className="toggle-text">
          {isSigningUp
            ? "Already have an account? Log In"
            : "Don't have an account? Sign Up"}
        </p>
      </div>
    </div>
  );
};

export default LoginBlock;
