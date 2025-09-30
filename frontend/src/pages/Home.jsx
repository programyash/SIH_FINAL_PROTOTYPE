import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../scss/Home.scss";
import Roadmap from "./components/Roadmap";

import Footer from "./Footer"

// Assets
import video from "../data/homevideo.mp4";
import learner from "../data/learner.jpg";
import coder from "../data/coder.jpg";
import debuger from "../data/debugger.jpg";

const Home = () => {
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState("");
  const [skill, setSkill] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCourseClick = (courseName) => {
  navigate("/lecture", { state: { course: courseName } });
};

  const handleGetRoadmap = async () => {
    if (!skill.trim()) {
      alert("Please enter a skill!")
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("https://sih-backend-4fcb.onrender.com/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch roadmap");
      }

      const data = await response.json();

      setRoadmap(JSON.stringify(data.roadmap, null, 2));
    } catch (error) {
      console.error("Error fetching roadmap:", error);
      setRoadmap("❌ Failed to fetch roadmap. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="home">
      {/* 🌟 Hero Section with background video */}
      <section className="hero">
        <video className="bg-video" autoPlay loop muted playsInline>
          <source src={video} type="video/mp4" />
        </video>
        <div className="hero-overlay">
          <h1>
            Experience the future of smart learning with innovative methods
            powered by <span>Artificial Intelligence</span>
          </h1>
          <button className="btn" onClick={() => navigate("/lecture")}>
            Explore
          </button>
        </div>
      </section>

      {/* 📘 Learners Section */}
      <div className="bg-section">
        <section className="section learner">
          <div className="text">
            <p className="tag">For Learners</p>
            <h2>Strengthen your mind with guided learning.</h2>
            <p>
              Our AI helps you think critically, solve problems, and sharpen your
              skills—without simply handing out answers. Learn at your own pace,
              from Algebra and SQL to Data Structures & Algorithms.
            </p>
            <button className="link-btn" onClick={() => navigate("/lecture")}>
              Learn More →
            </button>
          </div>
          <div className="img-container">
            <img src={learner} alt="Learner" />
          </div>
        </section>

        {/* 👨‍💻 Coders Section */}
        <section className="section coder">
          <div className="img-container">
            <img src={coder} alt="Coders with AI" />
          </div>
          <div className="text">
            <p className="tag">For Coders</p>
            <h2>Boost your coding with AI-driven support.</h2>
            <p>
              Designed for developers, our platform accelerates problem-solving,
              assists with compiling, and provides intelligent guidance—while
              keeping your code and projects secure.
            </p>
            <button className="link-btn" onClick={() => navigate("/compiler")}>
              Learn More →
            </button>
          </div>
        </section>

        {/* 🛠 Debuggers Section */}
        <section className="section debuger">
          <div className="text">
            <p className="tag">For Debuggers</p>
            <h2>Unleash AI to simplify debugging and problem-solving.</h2>
            <p>
              Built for developers by developers, our smart debugger helps you
              detect issues faster, resolve bugs with clarity, and streamline your
              workflow—all while ensuring your data stays private and secure.
            </p>
            <button
              className="link-btn"
              onClick={() => navigate("/start-solving")}
            >
              Learn More →
            </button>
          </div>
          <div className="img-container">
            <img src={debuger} alt="Debugger with AI" height="270px" />
          </div>
        </section>


        {/* 📍 Roadmap Section */}
        {/* 📍 Roadmap Section */}
        <section className="roadmap">
          <div className="roadmap-container">
            <h1>🎯 Achieve Your Goals with an AI-Generated Roadmap</h1>
            <p>
              Describe your learning goal and let <span>GyaanSetu</span> guide you
              with a step-by-step roadmap to success.
            </p>

            {/* Search / Get roadmap */}
            <div className="search-section">
              <input
                type="text"
                id="roadmap-search"
                placeholder="Search technology or skill..."
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
              />
              <button className="btn" onClick={handleGetRoadmap}>
                Get Roadmap
              </button>
            </div>

            {/* Text area for goals */}
            <div className="text-section">
              {loading ? (
                <div className="spinner-wrapper">
                  <div className="loading-spinner"></div>
                  <p>Generating your roadmap...</p>
                </div>
              ) : roadmap && roadmap !== "❌ Failed to fetch roadmap. Try again." ? (
                <Roadmap roadmap={JSON.parse(roadmap)} />
              ) : (
                <textarea
                  placeholder="Your AI-generated roadmap will appear here..."
                  rows="6"
                  value={roadmap}
                  readOnly
                ></textarea>
              )}
            </div>
          </div>
        </section>

      </div>

      <section className="resource-carousel">

        <div className="carousel_container">
          {/* Right Scrolling Courses */}
          <div className="rht_side_carousel">
            <div className="scroll-content">
              <p onClick={() => handleCourseClick("Python Programming")}>Python Programming</p>
              <p onClick={() => handleCourseClick("C++ Programming")}>C++ Programming</p>
              <p onClick={() => handleCourseClick("Data Structures & Algorithms")}>Data Structures & Algorithms</p>
              <p onClick={() => handleCourseClick("Machine Learning")}>Machine Learning</p>
              <p onClick={() => handleCourseClick("React Development")}>React Development</p>
              <p onClick={() => handleCourseClick("Cybersecurity Basics")}>Cybersecurity Basics</p>
              <p onClick={() => handleCourseClick("DevOps & Cloud")}>DevOps & Cloud</p>
              <p onClick={() => handleCourseClick("Blockchain Fundamentals")}>Blockchain Fundamentals</p>
            </div>
            {/* Duplicate for seamless loop */}
            <div className="scroll-content">
              <p onClick={() => handleCourseClick("Python Programming")}>Python Programming</p>
              <p onClick={() => handleCourseClick("C++ Programming")}>C++ Programming</p>
              <p onClick={() => handleCourseClick("Data Structures & Algorithms")}>Data Structures & Algorithms</p>
              <p onClick={() => handleCourseClick("Machine Learning")}>Machine Learning</p>
              <p onClick={() => handleCourseClick("React Development")}>React Development</p>
              <p onClick={() => handleCourseClick("Cybersecurity Basics")}>Cybersecurity Basics</p>
              <p onClick={() => handleCourseClick("DevOps & Cloud")}>DevOps & Cloud</p>
              <p onClick={() => handleCourseClick("Blockchain Fundamentals")}>Blockchain Fundamentals</p>
            </div>
          </div>

          {/* Left Scrolling Courses */}
          <div className="lft_side_carousel">
            <div className="scroll-content">
              <p onClick={() => handleCourseClick("Java Programming")}>Java Programming</p>
              <p onClick={() => handleCourseClick("Web Development")}>Web Development</p>
              <p onClick={() => handleCourseClick("Artificial Intelligence")}>Artificial Intelligence</p>
              <p onClick={() => handleCourseClick("Database Management (SQL & NoSQL)")}>Database Management (SQL & NoSQL)</p>
              <p onClick={() => handleCourseClick("Operating Systems")}>Operating Systems</p>
              <p onClick={() => handleCourseClick("System Design")}>System Design</p>
              <p onClick={() => handleCourseClick("Competitive Programming")}>Competitive Programming</p>
              <p onClick={() => handleCourseClick("Data Science with R")}>Data Science with R</p>
            </div>
            {/* Duplicate for seamless loop */}
            <div className="scroll-content">
             <p onClick={() => handleCourseClick("Java Programming")}>Java Programming</p>
              <p onClick={() => handleCourseClick("Web Development")}>Web Development</p>
              <p onClick={() => handleCourseClick("Artificial Intelligence")}>Artificial Intelligence</p>
              <p onClick={() => handleCourseClick("Database Management (SQL & NoSQL)")}>Database Management (SQL & NoSQL)</p>
              <p onClick={() => handleCourseClick("Operating Systems")}>Operating Systems</p>
              <p onClick={() => handleCourseClick("System Design")}>System Design</p>
              <p onClick={() => handleCourseClick("Competitive Programming")}>Competitive Programming</p>
              <p onClick={() => handleCourseClick("Data Science with R")}>Data Science with R</p>
            </div>
          </div>
        </div>
      </section>
      <Footer />

    </div>
  );
};

export default Home;