import React, { useState } from 'react';
import './login.scss';

const LoginBlock = () => {
    const [isSigningUp, setIsSigningUp] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [number, setNumber] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isSigningUp && password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }
        console.log(isSigningUp ? 'Sign-up attempt:' : 'Sign-in attempt:', { email, number, password });
    };

    return (
        <div className='login-block'>
            <div className="login">
                <h2>{isSigningUp ? 'Sign Up' : 'Log In'}</h2>
                
                <div className={`login-container ${isSigningUp ? 'expanded' : 'collapsed'}`}>
                    <form onSubmit={handleSubmit}>
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <input type="tel" placeholder="Phone Number" value={number} onChange={(e) => setNumber(e.target.value)} required />
                        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        {isSigningUp && (
                            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                        )}
                        <button type="submit">{isSigningUp ? 'Sign Up' : 'Sign In'}</button>
                    </form>
                </div>

                <p onClick={() => setIsSigningUp(!isSigningUp)} className="toggle-text">
                    {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                </p>
            </div>
        </div>
    );
};

export default LoginBlock;
