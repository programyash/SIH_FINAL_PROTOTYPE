import React, { useState } from "react";
import "../scss/Solve.scss"
import Footer from "./Footer";

// An array of available languages for the dropdown. Kept outside the component as it's static data.
const languages = [
  { value: "javascript", label: "JavaScript", icon: "🚀" },
  { value: "python", label: "Python", icon: "🐍" },
  { value: "java", label: "Java", icon: "☕" },
];

// A simple placeholder for the problem description.
const ProblemContent = () => (
  <div className="content-area">
    <h3>1. Two Sum</h3>
    <p>Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.</p>
    <p>You may assume that each input would have exactly one solution, and you may not use the same element twice.</p>
    <pre>
      <strong>Input:</strong> nums = [2,7,11,15], target = 9<br />
      <strong>Output:</strong> [0,1]
    </pre>
  </div>
);


// --- Main Component ---

const Solve = () => {
  // State for the selected language
  const [language, setLanguage] = useState("javascript");
  // State to track the active tab on the left panel
  const [activeLeftTab, setActiveLeftTab] = useState("question");

  return (
    <>
      <div className="solve-page-container">
        {/* Left Panel: For Problem Description, Approach, etc. */}
        <div className="problem-pane">
          <div className="panel-header">
            <button
              className={`tab-button ${activeLeftTab === 'question' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('question')}
            >
              Question
            </button>
            <button
              className={`tab-button ${activeLeftTab === 'approach' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('approach')}
            >
              Approach
            </button>
            <button
              className={`tab-button ${activeLeftTab === 'similar' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('similar')}
            >
              Similar Questions
            </button>
          </div>
          {/* Conditionally render content based on the active tab */}
          {activeLeftTab === 'question' && <ProblemContent />}
          {activeLeftTab === 'approach' && <div className="content-area placeholder">Approach details would be shown here.</div>}
          {activeLeftTab === 'similar' && <div className="content-area placeholder">A list of similar questions would appear here.</div>}
        </div>

        {/* Right Panel: For Compiler and Results */}
        <div className="solution-pane">
          <div className="compiler-area">
            <div className="panel-header">
              <div className="panel-title">#<span>Compile</span></div>
              <div className="panel-controls">
                <select id="language-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>{lang.icon} {lang.label}</option>
                  ))}
                </select>
                <button className="run-button">Run</button>
              </div>
            </div>
            <textarea
              className="code-editor"
              defaultValue={"// Start your code here..."}
            />
          </div>
          <div className="result-area">
            <div className="panel-header">
              <div className="panel-title">Result Console</div>
            </div>
            <div className="result-content placeholder">
              Run your code to see the results.
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Solve;

