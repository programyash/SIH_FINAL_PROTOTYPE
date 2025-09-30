import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coy } from "react-syntax-highlighter/dist/esm/styles/prism";
import "../scss/Quiz.scss";

const Quiz = ({ 
  lessonContent, 
  topic, 
  lessonTitle, 
  lessonIndex, 
  userId = "default_user",
  onQuizComplete,
  onClose 
}) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizId, setQuizId] = useState(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [codeOutput, setCodeOutput] = useState("");
  const [isExecutingCode, setIsExecutingCode] = useState(false);
  
  const timerRef = useRef(null);

  // Start timer when quiz begins
  useEffect(() => {
    if (questions.length > 0 && !startTime) {
      setStartTime(Date.now());
      timerRef.current = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [questions.length, startTime]);

  // Generate quiz when component mounts
  useEffect(() => {
    if (lessonContent && topic && lessonTitle !== undefined) {
      generateQuiz();
    }
  }, [lessonContent, topic, lessonTitle, lessonIndex]);

  const generateQuiz = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_content: lessonContent,
          topic: topic,
          lesson_title: lessonTitle,
          lesson_index: lessonIndex,
          user_id: userId
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate quiz");
      }

      const data = await response.json();
      
      if (data.success) {
        setQuestions(data.questions);
        setQuizId(data.quiz_id);
        setAnswers(new Array(data.questions.length).fill(null));
      } else {
        alert("Error generating quiz: " + data.error);
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      alert("Failed to generate quiz. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex, answer) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answer;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:8000/submit-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quizId,
          user_id: userId,
          answers: answers.map((answer, index) => ({
            question_index: index,
            answer: answer
          })),
          time_spent: timeSpent,
          lesson_index: lessonIndex,
          topic: topic
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit quiz");
      }

      const data = await response.json();
      
      if (data.success) {
        setQuizResults(data);
        setShowResults(true);
        
        // Call the completion callback with results
        if (onQuizComplete) {
          onQuizComplete({
            score: data.score,
            recommendation: data.recommendation,
            correctAnswers: data.correct_answers,
            totalQuestions: data.total_questions,
            timeSpent: data.time_spent
          });
        }
      } else {
        alert("Error submitting quiz: " + data.error);
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const executeCode = async (code, language = "python") => {
    setIsExecutingCode(true);
    setCodeOutput("");
    
    try {
      const response = await fetch("http://localhost:8000/execute-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code,
          language: language,
          timeout: 5
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute code");
      }

      const result = await response.json();
      
      if (result.success) {
        setCodeOutput(result.output);
      } else {
        setCodeOutput(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error executing code:", error);
      setCodeOutput(`Execution failed: ${error.message}`);
    } finally {
      setIsExecutingCode(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#4CAF50"; // Green
    if (score >= 60) return "#FF9800"; // Orange
    return "#F44336"; // Red
  };

  const getRecommendationMessage = (recommendation) => {
    switch (recommendation) {
      case "review":
        return "📚 Consider reviewing the lesson before moving forward";
      case "fast_track":
        return "🚀 Great job! You're ready for advanced topics";
      default:
        return "✅ Good progress! Continue to the next lesson";
    }
  };

  if (isLoading) {
    return (
      <div className="quiz-container">
        <div className="quiz-loading">
          <div className="loading-spinner"></div>
          <h3>🎯 Generating Quiz Questions...</h3>
          <p>Creating personalized questions based on your lesson</p>
        </div>
      </div>
    );
  }

  if (showResults && quizResults) {
    return (
      <div className="quiz-container">
        <div className="quiz-results">
          <div className="results-header">
            <h2>🎉 Quiz Complete!</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          
          <div className="score-display">
            <div 
              className="score-circle"
              style={{ borderColor: getScoreColor(quizResults.score) }}
            >
              <span className="score-number">{Math.round(quizResults.score)}%</span>
              <span className="score-label">Score</span>
            </div>
            
            <div className="score-details">
              <div className="score-stat">
                <span className="stat-value">{quizResults.correct_answers}</span>
                <span className="stat-label">Correct</span>
              </div>
              <div className="score-stat">
                <span className="stat-value">{quizResults.total_questions}</span>
                <span className="stat-label">Total</span>
              </div>
              <div className="score-stat">
                <span className="stat-value">{formatTime(quizResults.time_spent)}</span>
                <span className="stat-label">Time</span>
              </div>
            </div>
          </div>

          <div className="recommendation">
            <h4>📋 Recommendation</h4>
            <p className="recommendation-text">
              {getRecommendationMessage(quizResults.recommendation)}
            </p>
          </div>

          <div className="detailed-results">
            <h4>📊 Detailed Results</h4>
            <div className="results-list">
              {quizResults.detailed_results.map((result, index) => (
                <div key={index} className={`result-item ${result.is_correct ? 'correct' : 'incorrect'}`}>
                  <div className="result-header">
                    <span className="question-number">Q{index + 1}</span>
                    <span className="result-status">
                      {result.is_correct ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="result-question">{result.question}</div>
                  {!result.is_correct && (
                    <div className="result-explanation">
                      <strong>Explanation:</strong> {result.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="quiz-actions">
            <button className="btn-primary" onClick={onClose}>
              Continue Learning
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="quiz-container">
        <div className="quiz-error">
          <h3>❌ No Quiz Available</h3>
          <p>Unable to generate quiz questions for this lesson.</p>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const allQuestionsAnswered = answers.every(answer => answer !== null);

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2>🎯 Quiz: {lessonTitle}</h2>
        <div className="quiz-meta">
          <span className="question-counter">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="timer">⏱️ {formatTime(timeSpent)}</span>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="quiz-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
        <div className="progress-text">
          {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
        </div>
      </div>

      <div className="quiz-content">
        <div className="question-container">
          <div className="question-header">
            <span className="difficulty-badge difficulty-{currentQuestion.difficulty}">
              {currentQuestion.difficulty}
            </span>
            <span className="question-type">
              {currentQuestion.type === 'mcq' ? '📝 Multiple Choice' : '💻 Coding'}
            </span>
          </div>
          
          <div className="question-text">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={coy}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {currentQuestion.question}
            </ReactMarkdown>
          </div>

          <div className="answer-section">
            {currentQuestion.type === 'mcq' ? (
              <div className="mcq-options">
                {currentQuestion.options.map((option, index) => (
                  <label key={index} className="option-label">
                    <input
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      value={index}
                      checked={answers[currentQuestionIndex] === index}
                      onChange={(e) => handleAnswerChange(currentQuestionIndex, parseInt(e.target.value))}
                    />
                    <span className="option-text">{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="coding-answer">
                <textarea
                  className="code-input"
                  placeholder="Write your code here..."
                  value={answers[currentQuestionIndex] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                  rows={8}
                />
                
                <div className="code-execution">
                  <button 
                    className="run-code-btn"
                    onClick={() => executeCode(answers[currentQuestionIndex] || '', "python")}
                    disabled={isExecutingCode || !answers[currentQuestionIndex]}
                  >
                    {isExecutingCode ? (
                      <>
                        <div className="loading-spinner small"></div>
                        Running...
                      </>
                    ) : (
                      <>
                        ▶️ Run Code
                      </>
                    )}
                  </button>
                  
                  {codeOutput && (
                    <div className="code-output">
                      <strong>Output:</strong>
                      <pre>{codeOutput}</pre>
                    </div>
                  )}
                </div>
                
                {currentQuestion.expected_output && (
                  <div className="expected-output">
                    <strong>Expected Output:</strong>
                    <pre>{currentQuestion.expected_output}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="quiz-navigation">
          <button 
            className="nav-btn prev-btn"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            ⬅️ Previous
          </button>
          
          <div className="question-indicators">
            {questions.map((_, index) => (
              <button
                key={index}
                className={`question-indicator ${index === currentQuestionIndex ? 'active' : ''} ${answers[index] !== null ? 'answered' : ''}`}
                onClick={() => setCurrentQuestionIndex(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {isLastQuestion ? (
            <button 
              className="nav-btn submit-btn"
              onClick={handleSubmitQuiz}
              disabled={!allQuestionsAnswered || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="loading-spinner small"></div>
                  Submitting...
                </>
              ) : (
                'Submit Quiz 🎯'
              )}
            </button>
          ) : (
            <button 
              className="nav-btn next-btn"
              onClick={handleNext}
              disabled={answers[currentQuestionIndex] === null}
            >
              Next ➡️
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
