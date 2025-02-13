import React, { useState } from 'react';
import './login.scss';

const LoginBlock = () => {
    const [isSigningUp, setIsSigningUp] = useState(true);  // toggle for sign in/up
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
  
    const handleSubmit = (e) => {
      e.preventDefault();
      if (isSigningUp) {
        if (password !== confirmPassword) {
          alert("Passwords do not match!");
          return;
        }
        console.log('Sign-up attempt:', { email, password });
      } else {
        console.log('Sign-in attempt:', { email, password });
      }
      // add authentication logic here
    };
  
    return (
    <div className='login-block'>
        <div className="login">
        <h2>{isSigningUp ? 'Sign Up' : 'Log In'}</h2>
        <form onSubmit={handleSubmit}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
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
          <button type="submit">{isSigningUp ? 'Sign Up' : 'Sign In'}</button>
        </form>
        <p onClick={() => setIsSigningUp(!isSigningUp)} className="toggle-text">
          {isSigningUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
        </p>
      </div>
    </div>
      
  );
};

export default LoginBlock;