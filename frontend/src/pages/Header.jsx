import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../scss/Header.scss";
import gbl from "../data/gyaansetu black clear logo.jpg";
import gblue from "../data/gyaansetu blue clear logo.jpg";
import { GoArrowUpRight } from "react-icons/go";

// Profile Icon Component
const ProfileIcon = ({ onClick }) => (
  <img
    src="https://i.pravatar.cc/40?u=a042581f4e29026704d"
    alt="Profile"
    onClick={onClick}
    style={{
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      cursor: "pointer",
      border: "2px solid white",
    }}
  />
);

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(
    () => localStorage.getItem("loggedIn") === "true"
  ); // persist login state
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // If user visits profile page, mark as loggedIn
  useEffect(() => {
    if (location.pathname === "/profile") {
      setLoggedIn(true);
      localStorage.setItem("loggedIn", "true"); // save to localStorage
    }
  }, [location.pathname]);

  return (
    <header className={`header ${scrolled ? "scrolled" : ""}`}>
      {/* Logo */}
      <div className="logo" onClick={() => navigate("/")}>
        <img src={scrolled ? gblue : gbl} alt="GyaanSetu Logo" />
      </div>

      {/* Navigation */}
      <nav>
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/lecture">Lecture</NavLink>
        <NavLink to="/compiler">Compiler</NavLink>
        <NavLink to="/about">About</NavLink>
      </nav>

      {/* Buttons */}
      <div className="header-buttons">
        <button className="start" onClick={() => navigate("/solve")}>
          Start Solving <GoArrowUpRight className="upright" />
        </button>

        {loggedIn ? (
          <ProfileIcon onClick={() => navigate("/profile")} />
        ) : (
          <button className="sign" onClick={() => navigate("/signup")}>
            Sign Up
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
