import React, { useState, useEffect } from "react";
import "../scss/Compiler.scss";
import Footer from "./Footer";


// --- SVG Icon Helper Components ---
const LoadingSpinner = () => (
  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
const CodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4" /><path d="m6 8-4 4 4 4" /><path d="m14.5 4-5 16" /></svg>
);
const InputIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" /></svg>
);
const OutputIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-6" /><path d="M12 8V2" /><path d="m15 11-3-3-3 3" /><path d="m15 13 3 3 3-3" /></svg>
);


// --- Main Compiler App Component ---
export default function App() {
  // --- State Management ---
  const [code, setCode] = useState(
    `# Welcome to GyaanSetu AI Compiler!
# Current time in Amritsar: ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
# Your code runs in a secure, isolated environment.

def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        print(a, end=' ')
        a, b = b, a + b

print("Fibonacci sequence for n=10:")
fibonacci(10)`
  );
  const [language, setLanguage] = useState("python");
  const [inputData, setInputData] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState(0);
  const [codeHistory, setCodeHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // --- Static Data ---
  const languages = [
    { value: "python", label: "Python", icon: "🐍" },
    { value: "javascript", label: "JavaScript", icon: "🟨" },
    { value: "java", label: "Java", icon: "☕" },
  ];

  const exampleCodes = {
    python: `# Python: Find all prime numbers up to n...`,
    javascript: `// JavaScript: Simple Promise Example...`,
    java: `// Java: Factorial using recursion...`,
  };

  // --- Core Functions ---
  const runCode = async () => {
    if (!code.trim()) {
      setError("Please write some code before running!");
      return;
    }
    setIsRunning(true);
    setOutput("");
    setError("");
    setExecutionTime(0);

    await new Promise(resolve => setTimeout(resolve, 1200));

    try {
      const mockSuccess = Math.random() > 0.2;
      const result = mockSuccess ? {
        success: true,
        output: `Mock output for ${language}:\n0 1 1 2 3 5 8 13 21 34`,
        execution_time: Math.random() * 0.5 + 0.1,
      } : {
        success: false,
        error: `Mock ${language} Error:\nSyntaxError: invalid syntax on line 5`,
        execution_time: Math.random() * 0.1,
      };

      if (result.success) {
        setOutput(result.output);
        setExecutionTime(result.execution_time);
        const historyEntry = {
          id: Date.now(),
          code, language, output: result.output,
          executionTime: result.execution_time,
          timestamp: new Date().toLocaleTimeString(),
        };
        setCodeHistory((prev) => [historyEntry, ...prev.slice(0, 19)]);
      } else {
        setError(result.error);
        setExecutionTime(result.execution_time || 0);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsRunning(false);
    }
  };

  const loadExample = () => { setCode(exampleCodes[language]); setOutput(""); setError(""); };
  const clearAll = () => { setCode(""); setOutput(""); setError(""); setInputData(""); };
  const loadFromHistory = (entry) => {
    setCode(entry.code); setLanguage(entry.language);
    setOutput(entry.output || ""); setError(""); setShowHistory(false);
  };

  // --- Render Method ---
  return (
    <>
      <div className="compiler-page">
        <main className={showHistory ? 'history-open' : ''}>
          <header className="compiler-header">
            <h1>GyaanSetu AI Compiler</h1>
            <p>The modern, reliable way to write, run, and test code.</p>
          </header>

          <div className="compiler-controls">
            <div className="language-selector">
              <label htmlFor="language-select"></label>
              <select id="language-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.icon} {lang.label}</option>
                ))}
              </select>
            </div>
            <div className="action-buttons">
              <button className="btn btn-secondary" onClick={loadExample}>Load Example</button>
              <button className="btn btn-danger" onClick={clearAll}>Clear All</button>
              <button className="btn btn-secondary" onClick={() => setShowHistory(!showHistory)}>📜 History</button>
              <button className="btn btn-primary" onClick={runCode} disabled={isRunning}>
                ▶ {isRunning ? "Running..." : "Run Code"}
              </button>
            </div>
          </div>

          <div className="compiler-workspace">
            <div className="code-editor-section panel">
              <div className="panel-header">
                <h3><CodeIcon /> Code Editor</h3>
                <span className="language-badge">{languages.find((l) => l.value === language)?.label}</span>
              </div>
              <div className="panel-content">
                <textarea
                  value={code} onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter your code here..." spellCheck="false"
                />
              </div>
            </div>

            <div className="io-section">
              <div className="input-panel panel">
                <div className="panel-header">
                  <h3><InputIcon /> Input <span>(Optional)</span></h3>
                </div>
                <div className="panel-content">
                  <textarea
                    value={inputData} onChange={(e) => setInputData(e.target.value)}
                    placeholder="Enter input for your code..." spellCheck="false"
                  />
                </div>
              </div>
              <div className="output-panel panel">
                <div className="panel-header">
                  <h3><OutputIcon /> Output</h3>
                  {executionTime > 0 && (
                    <span className="execution-time">⏱️ {executionTime.toFixed(4)}s</span>
                  )}
                </div>
                <div className="panel-content">
                  {isRunning && (
                    <div className="output-loading">
                      <LoadingSpinner />
                      <span>Executing...</span>
                    </div>
                  )}
                  {error ? (
                    <div className="output-error">
                      <div className="error-header">❌ Error</div>
                      <pre>{error}</pre>
                    </div>
                  ) : output ? (
                    <pre className="output-success">{output}</pre>
                  ) : (
                    <div className="output-placeholder">Your code's output will appear here.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className={`history-sidebar ${showHistory ? 'open' : ''}`}>
          <div className="history-header">
            <h3>📜 Code History</h3>
            <button onClick={() => setShowHistory(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div className="history-content">
            {codeHistory.length === 0 ? (
              <div className="no-history">Run some code to see it saved here.</div>
            ) : (
              codeHistory.map((entry) => (
                <div key={entry.id} className="history-item" onClick={() => loadFromHistory(entry)}>
                  <div className="history-item-header">
                    <span>{languages.find((l) => l.value === entry.language)?.icon} {entry.language}</span>
                    <span>{entry.timestamp}</span>
                  </div>
                  <pre>{entry.code.split('\n')[0]}</pre>
                  <div className="history-item-meta">⏱️ {entry.executionTime.toFixed(4)}s</div>
                </div>
              ))
            )}
          </div>
        </aside>

        <div
          className={`sidebar-overlay ${showHistory ? 'open' : ''}`}
          onClick={() => setShowHistory(false)}
        ></div>
      </div>
      <footer >
        <Footer />
      </footer>
    </>
  );
}
