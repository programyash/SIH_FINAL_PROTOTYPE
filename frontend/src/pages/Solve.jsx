import React, { useState } from "react";
import "../scss/Solve.scss"
import Footer from "./Footer";

// An array of available languages for the dropdown. Kept outside the component as it's static data.
const languages = [
  { value: "javascript", label: "JavaScript", icon: "🚀" },
  { value: "python", label: "Python", icon: "🐍" },
  { value: "java", label: "Java", icon: "☕" },
];

// Sample questions data structure
const sampleQuestions = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "easy",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    example: "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]",
    solution: "Use a hash map to store numbers and their indices. For each number, check if target - number exists in the map."
  },
  {
    id: 2,
    title: "Add Two Numbers",
    difficulty: "medium",
    description: "You are given two non-empty linked lists representing two non-negative integers. Add the two numbers and return the sum as a linked list.",
    example: "Input: l1 = [2,4,3], l2 = [5,6,4]\nOutput: [7,0,8]",
    solution: "Traverse both lists simultaneously, add corresponding digits, and handle carry."
  },
  {
    id: 3,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "medium",
    description: "Given a string s, find the length of the longest substring without repeating characters.",
    example: "Input: s = 'abcabcbb'\nOutput: 3",
    solution: "Use sliding window technique with a set to track characters in current window."
  },
  {
    id: 4,
    title: "Median of Two Sorted Arrays",
    difficulty: "hard",
    description: "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.",
    example: "Input: nums1 = [1,3], nums2 = [2]\nOutput: 2.00000",
    solution: "Use binary search to partition both arrays such that left partition has equal or one more element than right partition."
  }
];

// Question Card Component
const QuestionCard = ({ question, onViewSolution }) => {
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#22c55e';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="question-card">
      <div className="question-header">
        <h3>{question.title}</h3>
        <span 
          className="difficulty-tag"
          style={{ backgroundColor: getDifficultyColor(question.difficulty) }}
        >
          {question.difficulty.toUpperCase()}
        </span>
      </div>
      <p className="question-description">{question.description}</p>
      <div className="question-example">
        <strong>Example:</strong>
        <pre>{question.example}</pre>
      </div>
      <button 
        className="solution-button"
        onClick={() => onViewSolution(question)}
      >
        View Solution
      </button>
    </div>
  );
};

// Topic Input Component
const TopicInput = ({ onGenerateQuestions }) => {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (topic.trim()) {
      onGenerateQuestions(topic.trim());
      setTopic('');
    }
  };

  return (
    <div className="topic-input-section">
      <h2>Generate Questions by Topic</h2>
      <form onSubmit={handleSubmit} className="topic-form">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic (e.g., Arrays, Linked Lists, Dynamic Programming)"
          className="topic-input"
        />
        <button type="submit" className="generate-button">
          Generate Questions
        </button>
      </form>
  </div>
);
};


// --- Main Component ---

const Solve = () => {
  // State for the selected language
  const [language, setLanguage] = useState("javascript");
  // State to track the active tab on the left panel
  const [activeLeftTab, setActiveLeftTab] = useState("questions");
  // State for generated questions
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  // State for selected question
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  // State for showing solution
  const [showSolution, setShowSolution] = useState(false);

  // Function to generate questions based on topic
  const generateQuestions = (topic) => {
    // Filter sample questions based on topic (in a real app, this would be an API call)
    const filteredQuestions = sampleQuestions.filter(q => 
      q.title.toLowerCase().includes(topic.toLowerCase()) ||
      q.description.toLowerCase().includes(topic.toLowerCase())
    );
    
    // If no specific matches, return all questions for demonstration
    const questionsToShow = filteredQuestions.length > 0 ? filteredQuestions : sampleQuestions;
    setGeneratedQuestions(questionsToShow);
    setActiveLeftTab('questions');
  };

  // Function to handle viewing solution
  const handleViewSolution = (question) => {
    setSelectedQuestion(question);
    setShowSolution(true);
    setActiveLeftTab('solution');
  };

  // Function to start solving a question
  const startSolving = (question) => {
    setSelectedQuestion(question);
    setShowSolution(false);
    setActiveLeftTab('question');
  };

  // Render questions list
  const QuestionsList = () => (
    <div className="questions-list">
      <TopicInput onGenerateQuestions={generateQuestions} />
      {generatedQuestions.length > 0 && (
        <div className="questions-grid">
          {generatedQuestions.map(question => (
            <QuestionCard 
              key={question.id} 
              question={question} 
              onViewSolution={handleViewSolution}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Render selected question
  const SelectedQuestion = () => (
    <div className="content-area">
      {selectedQuestion && (
        <>
          <h3>{selectedQuestion.title}</h3>
          <p>{selectedQuestion.description}</p>
          <div className="question-example">
            <strong>Example:</strong>
            <pre>{selectedQuestion.example}</pre>
          </div>
          <div className="question-actions">
            <button 
              className="solution-button"
              onClick={() => handleViewSolution(selectedQuestion)}
            >
              View Solution
            </button>
            <button 
              className="start-solving-button"
              onClick={() => startSolving(selectedQuestion)}
            >
              Start Solving
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Render solution
  const SolutionView = () => (
    <div className="content-area">
      {selectedQuestion && (
        <>
          <h3>Solution for {selectedQuestion.title}</h3>
          <div className="solution-content">
            <p><strong>Approach:</strong> {selectedQuestion.solution}</p>
            <div className="solution-code">
              <h4>Code Implementation:</h4>
              <pre>{`// ${selectedQuestion.title} Solution
// Time Complexity: O(n)
// Space Complexity: O(n)

function solution() {
    // Implementation would go here
    // This is a placeholder for the actual solution
}`}</pre>
            </div>
          </div>
          <button 
            className="back-to-question-button"
            onClick={() => setActiveLeftTab('question')}
          >
            Back to Question
          </button>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="solve-page-container">
        {/* Left Panel: For Questions, Problem Description, Solution */}
        <div className="problem-pane">
          <div className="panel-header">
            <button
              className={`tab-button ${activeLeftTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('questions')}
            >
              Questions
            </button>
            <button
              className={`tab-button ${activeLeftTab === 'question' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('question')}
            >
              Problem
            </button>
            <button
              className={`tab-button ${activeLeftTab === 'solution' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('solution')}
            >
              Solution
            </button>
          </div>
          {/* Conditionally render content based on the active tab */}
          {activeLeftTab === 'questions' && <QuestionsList />}
          {activeLeftTab === 'question' && <SelectedQuestion />}
          {activeLeftTab === 'solution' && <SolutionView />}
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

