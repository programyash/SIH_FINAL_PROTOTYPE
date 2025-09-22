import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../scss/Header.scss";
import gbl from "../data/gyaansetu black clear logo.jpg";
import gblue from "../data/gyaansetu blue clear logo.jpg";

import { GoArrowUpRight } from "react-icons/go";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
  // const signup = document.querySelector(".sign");
  // const header = document.querySelector(".header");

  // if (signup && header) {
  //   const handleClick = () => {
  //     header.style.display = "none";
  //   };

  //   signup.addEventListener("click", handleClick);

  //   return () => {
  //     signup.removeEventListener("click", handleClick);
  //   };
  // }

  const handleScroll = () => setScrolled(window.scrollY > 50);
  window.addEventListener("scroll", handleScroll);

  return () => {
    window.removeEventListener("scroll", handleScroll);
  };
}, []);


  
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
          Start Solving <GoArrowUpRight className="upright"/>
        </button>
        <button className="sign" onClick={() => navigate("/signup")}>
          Sign Up
        </button>
      </div>
    </header>
  );
};

export default Header;
