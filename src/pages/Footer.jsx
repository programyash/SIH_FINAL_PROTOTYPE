import React from "react";
import { Link } from "react-router-dom";
import "../scss/Footer.scss";
import logo from "../data/gyaanset blue logo.jpg";
const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-container">

                {/* Brand Section */}
                <div className="footer-brand">
                    <h2 className="logo">
                        <img src={logo} alt="" />
                    </h2>
                    <p>
                        Empowering learners, coders, and innovators with AI-driven tools for
                        smarter education and problem-solving.
                    </p>
                </div>

                {/* Quick Links */}
                <div className="footer-links">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><Link to="/lecture">Lectures</Link></li>
                        <li><Link to="/compiler">Compiler</Link></li>
                        <li><Link to="/start-solving">Start Solving</Link></li>
                        <li><Link to="/about">About</Link></li>
                    </ul>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© {new Date().getFullYear()} GyaanSetu. All Rights Reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
