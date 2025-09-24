import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../pages/Header";
import "../scss/Signup.scss";

// --- SVG Icon Components ---
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

const EmailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
    </svg>
);

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        viewBox="0 0 24 24">
        <path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 
      15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 
      5,12C5,7.9 8.2,4.73 12.19,4.73C14.76,4.73 
      16.04,5.7 17.1,6.58L19.27,4.44C17.22,2.56 
      14.86,1.5 12.19,1.5C7.22,1.5 3.31,5.34 
      3.31,12C3.31,18.67 7.22,22.5 12.19,22.5C17.02,22.5 
      21.5,18.81 21.5,12.33C21.5,11.76 21.45,11.43 
      21.35,11.1Z" />
    </svg>
);

const LoadingSpinner = () => <div className="spinner"></div>;

const Signup = () => {
    const navigate = useNavigate();

    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [error, setError] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [hideHeader, setHideHeader] = React.useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!name || !email || !password || !confirmPassword) {
            setError("All fields are required.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        // hide header after signup button click
        setHideHeader(true);

        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsLoading(false);

        console.log("Signup successful for:", { name, email });

        // Navigate to profile page
        navigate("/profile");
    };

    return (
        <div className="signup-page">
            {!hideHeader && (
                <div className="header">
                </div>
            )}

            <div className="signup-container">
                <div className="branding-panel">
                    <div className="branding-content">
                        <h1>Welcome to GyaanSetu AI</h1>
                        <p>
                            Unlock the future of learning. Join a community of innovators and
                            creators.
                        </p>
                    </div>
                </div>

                <div className="form-panel">
                    <div className="form-container">
                        <h2>Create Your Account</h2>
                        <p className="subtitle">Start your journey with us today.</p>
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="input-group">
                                <UserIcon />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <EmailIcon />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <LockIcon />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <LockIcon />
                                <input
                                    type="password"
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {error && <p className="error-message">{error}</p>}

                            <button
                            onClick={() => navigate("/profile")}
                                type="submit"
                                className="btn-signup"
                                disabled={isLoading}    
                            >
                                {isLoading ? <LoadingSpinner /> : "Create Account"}
                            </button>

                            <div className="divider">
                                <span>OR</span>
                            </div>

                            
                        </form>

                        <p className="login-link">
                            Already have an account? <a href="/login">Log In</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
