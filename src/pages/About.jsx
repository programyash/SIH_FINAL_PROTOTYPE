import React from "react";
import "../scss/About.scss";
import Footer from "./Footer";

// Importing icons from react-icons
import { FaLaptopCode, FaRocket, FaUsers, FaBrain, FaChartLine, FaMagic } from "react-icons/fa";
import { SlArrowLeft, SlArrowRight } from "react-icons/sl";
import { HiMiniCodeBracket } from "react-icons/hi2";

const About = () => {
  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="overlay"></div>
        <div className="about-content">
          <h1>
            The Future of Learning is Here. <span>Welcome to GyaanSetu.</span>
          </h1>
          <p>
            GyaanSetu is an intelligent ecosystem, not just an app. We break down the barriers between learning, practicing, and collaborating. Stop juggling platforms and start mastering skills with our unified, AI-driven approach designed for the ambitious learner in you.
          </p>
        </div>
      </section>

      {/* Features Section (Previously Flip-Flop) */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Your All-in-One <SlArrowLeft className="leftarrow"/> Learning Hub <SlArrowRight className="rightarrow"/></h2>
          <div className="features-grid">
            {/* Card 1: AI Video Lectures */}
            <div className="feature-card">
              <div className="card-inner">
                <div className="card-front">
                  <FaMagic className="icon" />
                  <h3>AI-Powered Lectures</h3>
                </div>
                <div className="card-back">
                  <p>
                    Learn smarter, not harder. Our AI curates bite-sized video lessons tailored to your unique learning pace and style.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Interactive Code Compiler */}
            <div className="feature-card">
              <div className="card-inner">
                <div className="card-front">
                  <FaLaptopCode className="icon" />
                  <h3>Interactive Code Sandbox</h3>
                </div>
                <div className="card-back">
                  <p>
                    Go from theory to practice instantly. Code, compile, and debug within the platform, with AI guidance to sharpen your skills.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: AI Doubt Solver */}
            <div className="feature-card">
              <div className="card-inner">
                <div className="card-front">
                  <FaBrain className="icon" />
                  <h3>24/7 AI Mentor</h3>
                </div>
                <div className="card-back">
                  <p>
                    Never get stuck again. Our AI Tutor provides instant, step-by-step guidance on any problem, anytime you need it.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 4: Study Groups */}
            <div className="feature-card">
              <div className="card-inner">
                <div className="card-front">
                  <FaUsers className="icon" />
                  <h3>Collaborative Study Groups</h3>
                </div>
                <div className="card-back">
                  <p>
                    Connect and conquer. Join digital study circles to share insights, tackle challenges, and grow with your peers.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 5: Unified Ecosystem */}
            <div className="feature-card">
              <div className="card-inner">
                <div className="card-front">
                  <FaRocket className="icon" />
                  <h3>A Unified Ecosystem</h3>
                </div>
                <div className="card-back">
                  <p>
                    From video content to coding and collaboration, every tool you need is seamlessly integrated for a frictionless learning journey.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 6: Performance Report */}
            <div className="feature-card">
              <div className="card-inner">
                <div className="card-front">
                  <FaChartLine className="icon" />
                  <h3>Actionable Performance Insights</h3>
                </div>
                <div className="card-back">
                  <p>
                    Track your progress with detailed analytics. Identify strengths and weaknesses to focus your efforts where they matter most.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission-section">
        <div className="container">
          <h2 className="section-title">Our Mission <HiMiniCodeBracket className="himini" /></h2>
          <p className="mission-text">
            To empower every student with personalized, accessible, and highly effective learning tools. We believe that by harnessing the power of AI, we can unlock individual potential and make quality education a seamless part of daily life. GyaanSetu is our commitment to building that future.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;