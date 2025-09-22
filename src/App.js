import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./pages/Header";
import "./scss/Header.scss";
import Home from "./pages/Home";
import Lecture from "./pages/Lecture";
import Compiler from "./pages/Compiler";
import Solve from "./pages/Solve";
import About from "./pages/About";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile"; // import your Profile page

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lecture" element={<Lecture />} />
        <Route path="/compiler" element={<Compiler />} />
        <Route path="/solve" element={<Solve />} />
        <Route path="/about" element={<About />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  );
}

export default App;
