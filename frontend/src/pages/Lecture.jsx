import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coy } from "react-syntax-highlighter/dist/esm/styles/prism";
import Quiz from "./Quiz";
import ProgressDashboard from "./ProgressDashboard";
import "../scss/Lecture.scss";
import avatar from "../data/avatar2.mp4"
// --- Helper Component for Icons ---
const Icon = ({ path }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
    </svg>
);

const Lecture = () => {
    const [courseTitle, setCourseTitle] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [lectureContent, setLectureContent] = useState(null);
    const [syllabus, setSyllabus] = useState([]);
    const [topic, setTopic] = useState("");
    const [mode, setMode] = useState("");
    const [currentLesson, setCurrentLesson] = useState(0);
    const [doubt, setDoubt] = useState("");
    const [doubtsList, setDoubtsList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDoubtLoading, setIsDoubtLoading] = useState(false);
    const [doubtAnswers, setDoubtAnswers] = useState([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [learningHistory, setLearningHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const [showProgressDashboard, setShowProgressDashboard] = useState(false);
    const [quizRecommendation, setQuizRecommendation] = useState(null);

    const location = useLocation();
    const historyClickLockRef = useRef(false);
    const historyOpenedAtRef = useRef(0);

    // when page loads, check if course was passed from Home
    useEffect(() => {
        if (location.state?.course) {
            setSearchInput(location.state.course);
            handleSearch(location.state.course);
        }
    }, [location.state]);

    // ✨ NEW: State for Toast Notifications
    const [toast, setToast] = useState({ show: false, message: "", type: "info" });

    const videoRef = useRef(null);
    const streamAbortRef = useRef(null);
    const streamMetaRef = useRef(null);
    const streamContentRef = useRef("");

    // Load history on component mount
    useEffect(() => {
        loadHistory();
    }, []);

    // ✨ NEW: Function to show toast notifications
    const showToast = (message, type = "info") => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: "", type: "info" });
        }, 3000); // Hide after 3 seconds
    };

    // 📚 Learning History Management
    const saveToHistory = (lessonData) => {
        const historyEntry = {
            id: Date.now(),
            topic: lessonData.topic || courseTitle,
            lessonTitle: lessonData.lessonTitle || `Lesson ${currentLesson + 1}`,
            content: lessonData.content,
            syllabus: lessonData.syllabus,
            currentLesson: lessonData.currentLesson || 0,
            timestamp: new Date().toISOString(),
            duration: lessonData.duration || 0
        };
        const updatedHistory = [historyEntry, ...learningHistory.slice(0, 9)];
        setLearningHistory(updatedHistory);
        localStorage.setItem('learningHistory', JSON.stringify(updatedHistory));
    };

    const loadHistory = () => {
        const saved = localStorage.getItem('learningHistory');
        if (saved) {
            setLearningHistory(JSON.parse(saved));
        }
    };

    const openHistoryLesson = (historyEntry) => {
        if (Date.now() - historyOpenedAtRef.current < 600) {
            return;
        }
        setTopic(historyEntry.topic);
        setCourseTitle(historyEntry.topic);
        setLectureContent(historyEntry.content);
        setSyllabus(historyEntry.syllabus);
        setCurrentLesson(historyEntry.currentLesson);
        setMode("course");
        setShowHistory(false);
    };

    const clearHistory = () => {
        setLearningHistory([]);
        localStorage.removeItem('learningHistory');
        showToast("Learning history cleared!", "success");
    };

    // 🎯 Quiz Management
    const handleQuizComplete = (results) => {
        setQuizRecommendation(results);
        setShowQuiz(false);

        let message = "";
        let type = "info";
        switch (results.recommendation) {
            case "review":
                message = `📚 Quiz Score: ${Math.round(results.score)}% - Consider reviewing this lesson.`;
                type = "warning";
                break;
            case "fast_track":
                message = `🚀 Quiz Score: ${Math.round(results.score)}% - Excellent! You're ready for more.`;
                type = "success";
                break;
            default:
                message = `✅ Quiz Score: ${Math.round(results.score)}% - Good progress! Continue to the next lesson.`;
                type = "success";
        }
        // ✨ REPLACED alert() with showToast()
        showToast(message, type);
    };

    const handleStartQuiz = () => {
        if (!lectureContent) {
            showToast("Please start a lecture first!", "warning");
            return;
        }
        setShowQuiz(true);
    };

    // 🔍 Search course
    const handleSearch = async (customQuery) => {
        const query = customQuery || searchInput;
        if (!query.trim()) {
            showToast("Please enter a course or topic!", "warning");
            return;
        }
        setIsLoading(true);
        // cancel any previous stream
        if (streamAbortRef.current) {
            try { streamAbortRef.current.abort(); } catch (e) { }
            streamAbortRef.current = null;
        }
        if (!customQuery) {
            setLectureContent(null);
            setSyllabus([]);
            setTopic("");
            setMode("");
            setCurrentLesson(0);
            setCourseTitle("");
        }
        try {
            const controller = new AbortController();
            streamAbortRef.current = controller;
            streamMetaRef.current = null;
            streamContentRef.current = "";

            const response = await fetch("http://localhost:8000/course-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, thread_id: "1" }),
                signal: controller.signal
            });
            if (!response.ok || !response.body) throw new Error("Failed to start stream");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let ndjsonBuffer = "";

            const processText = (text) => {
                ndjsonBuffer += text;
                const lines = ndjsonBuffer.split("\n");
                ndjsonBuffer = lines.pop(); // remainder
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const evt = JSON.parse(line);
                        if (evt.type === "meta") {
                            streamMetaRef.current = evt;
                            const theTopic = evt.topic || query;
                            setCourseTitle(theTopic);
                            setTopic(theTopic);
                            setMode(evt.mode || "");
                            setSyllabus(Array.isArray(evt.syllabus) ? evt.syllabus : []);
                            setCurrentLesson(typeof evt.current_lesson === "number" ? evt.current_lesson : 0);
                            setLectureContent("");
                        } else if (evt.type === "chunk") {
                            streamContentRef.current += (evt.markdown || "") + "\n\n";
                            setLectureContent(prev => (prev || "") + (evt.markdown || "") + "\n\n");
                        } else if (evt.type === "done") {
                            // save to history after full content received
                            const meta = streamMetaRef.current;
                            if (meta && meta.mode === "course" && Array.isArray(meta.syllabus) && meta.syllabus.length > 0) {
                                const firstTitle = meta.syllabus[0]?.title || `Lesson ${ (meta.current_lesson||0) + 1 }`;
                                saveToHistory({
                                    topic: meta.topic || query,
                                    lessonTitle: firstTitle,
                                    content: streamContentRef.current,
                                    syllabus: meta.syllabus,
                                    currentLesson: meta.current_lesson || 0
                                });
                            }
                        } else if (evt.type === "error") {
                            showToast("Error: " + (evt.error || "Unknown error"), "error");
                        }
                    } catch (e) { /* ignore parse errors per line */ }
                }
            };

            // read loop
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                processText(decoder.decode(value, { stream: true }));
            }
            // flush any remaining buffered text
            const tail = decoder.decode();
            if (tail) processText(tail);
        } catch (error) {
            if (error?.name !== 'AbortError') {
                console.error("Stream error: ", error);
                showToast("Failed to connect to the server.", "error");
            }
        } finally {
            setIsLoading(false);
            streamAbortRef.current = null;
        }
    };

    // Navigation
    const handleNext = () => handleSearch("next");
    const handlePrevious = () => handleSearch("previous");
    const handleRepeat = () => handleSearch("repeat");
    const handleLessonClick = (lessonIndex) => handleSearch(`goto ${lessonIndex + 1}`);

    // 📥 Download Notes
    const handleDownloadNotes = async () => {
        if (!lectureContent) {
            showToast("No lesson content to download!", "warning");
            return;
        }
        setIsDownloading(true);
        try {
            const response = await fetch("http://localhost:8000/download-notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lesson_content: lectureContent,
                    topic: topic || courseTitle,
                    lesson_title: syllabus[currentLesson]?.title || `Lesson ${currentLesson + 1}`
                }),
            });
            if (!response.ok) throw new Error("Failed to generate PDF");
            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition ? contentDisposition.split('filename=')[1] : `${topic || courseTitle}_notes.pdf`;
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            showToast("Notes downloaded successfully!", "success");
        } catch (error) {
            console.error("Error downloading notes: ", error);
            showToast("Failed to download notes. Please try again.", "error");
        } finally {
            setIsDownloading(false);
        }
    };

    // ❓ Ask doubt
    const handleAskDoubt = async () => {
        if (!doubt.trim()) {
            showToast("Please enter your doubt!", "warning");
            return;
        }
        if (!lectureContent) {
            showToast("Please start a lecture first to ask doubts!", "warning");
            return;
        }
        setIsDoubtLoading(true);
        const currentDoubt = doubt.trim();
        try {
            const response = await fetch("http://localhost:8000/doubt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    doubt: currentDoubt,
                    lesson_context: lectureContent,
                    topic: topic || courseTitle,
                    thread_id: "1"
                }),
            });
            if (!response.ok) throw new Error("Failed to get doubt answer");
            const data = await response.json();
            if (data.success) {
                const doubtEntry = {
                    id: Date.now(),
                    doubt: currentDoubt,
                    answer: data.answer,
                    topic: data.topic,
                    timestamp: new Date().toLocaleTimeString()
                };
                setDoubtAnswers(prev => [doubtEntry, ...prev]);
                setDoubtsList(prev => [currentDoubt, ...prev]);
                setDoubt("");
            } else {
                showToast("Error: " + data.error, "error");
            }
        } catch (error) {
            console.error("Error asking doubt: ", error);
            showToast("Failed to get answer. Please try again.", "error");
        } finally {
            setIsDoubtLoading(false);
        }
    };

    // ✨ NEW: Add class when a modal/sidebar is open for overlay effect
    const isOverlayActive = showHistory || showQuiz || showProgressDashboard;

    return (
        <div className={`lecture-page ${isOverlayActive ? 'overlay-active' : ''}`}>
            <Header />

            {/* ✨ NEW: Toast Notification Component */}
            {toast.show && (
                <div className={`toast-notification ${toast.type} ${toast.show ? 'show' : ''}`}>
                    {toast.message}
                </div>
            )}

            <main className="lecture-content">
                <div className="search-lecture">
                    {/* ✨ NEW: Input with Icon */}
                    <div className="input-with-icon">
                        <Icon path="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        <input
                            type="text"
                            id="lecsearch"
                            placeholder="What do you want to learn today?"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <button onClick={() => handleSearch()} disabled={isLoading} className={isLoading ? "loading-btn" : ""}>
                        {isLoading ? (<><div className="loading-spinner"></div><span>Loading...</span></>) : "Start Learning"}
                    </button>
                </div>

                <div className="course-title-header">
                    <h3>{courseTitle || "Search a Course to Begin Your Journey"}</h3>
                </div>

                <div className="lecture-area">
                    <div className="live-lecture">
                        {courseTitle ? (
                            <>
                                {lectureContent ? (
                                    <div className="lecture-details">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                            code({ inline, className, children, ...props }) {
                                                const match = /language-(\w+)/.exec(className || "");
                                                return !inline && match ? (
                                                    <SyntaxHighlighter style={coy} language={match[1]} PreTag="div" {...props}>
                                                        {String(children).replace(/\n$/, "")}
                                                    </SyntaxHighlighter>
                                                ) : (
                                                    <code className={className} {...props}>{children}</code>
                                                );
                                            },
                                        }}>
                                            {lectureContent}
                                        </ReactMarkdown>
                                        <div className="lecture-controls">
                                            <button className="nav-btn prev-btn" onClick={handlePrevious} disabled={isLoading || mode !== "course" || currentLesson === 0}>
                                                {isLoading ? <div className="loading-spinner small"></div> : <span className="btn-icon">⬅️</span>}
                                                <span className="btn-text">Previous</span>
                                            </button>
                                            <button className="nav-btn repeat-btn" onClick={handleRepeat} disabled={isLoading || mode !== "course" || syllabus.length === 0}>
                                                {isLoading ? <div className="loading-spinner small"></div> : <span className="btn-icon">🔁</span>}
                                                <span className="btn-text">Repeat</span>
                                            </button>
                                            <button className="nav-btn download-btn" onClick={handleDownloadNotes} disabled={isDownloading || !lectureContent}>
                                                {isDownloading ? <div className="loading-spinner small"></div> : <span className="btn-icon">📥</span>}
                                                <span className="btn-text">Download Notes</span>
                                            </button>
                                            <button className="nav-btn quiz-btn" onClick={handleStartQuiz} disabled={!lectureContent}>
                                                <span className="btn-icon">🎯</span>
                                                <span className="btn-text">Take Quiz</span>
                                            </button>
                                            <button className="nav-btn next-btn" onClick={handleNext} disabled={isLoading || mode !== "course" || currentLesson >= syllabus.length - 1}>
                                                <span className="btn-text">Next</span>
                                                {isLoading ? <div className="loading-spinner small"></div> : <span className="btn-icon">➡️</span>}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="placeholder">Loading lecture content...</div>
                                )}
                            </>
                        ) : (
                            <div className="placeholder">
                                <h2>Welcome to Your AI Learning Space!</h2>
                                <p>Generate personalized video lessons on any topic instantly.</p>
                                <p>Let's get started!</p>
                            </div>
                        )}
                    </div>

                    {/* --- ✨ NEW AVATAR ELEMENT --- */}
                    {courseTitle && (
                        <div className="avatar-container">
                            <img src={avatar} alt="AI Tutor Avatar" className="avatar-image" />
                        </div>
                    )}


                    {mode === "course" && syllabus.length > 0 && (
                        <div className="syllabus-sidebar">
                            <div className="syllabus-header">
                                <h3>📚 Syllabus</h3>
                                <span className="course-title">{topic}</span>
                            </div>
                            <div className="syllabus-content">
                                <ol>
                                    {syllabus.map((item, idx) => (
                                        <li
                                            key={idx}
                                            className={`syllabus-item ${idx === currentLesson ? 'active' : ''} ${idx !== currentLesson ? 'clickable' : ''} ${isLoading ? 'loading' : ''}`}
                                            onClick={() => idx !== currentLesson && !isLoading && handleLessonClick(idx)}
                                        >
                                            <div className="lesson-number">
                                                {isLoading && idx !== currentLesson ? <div className="loading-spinner tiny"></div> : idx + 1}
                                            </div>
                                            <div className="lesson-content">
                                                <div className="lesson-title">{item.title}</div>
                                                <div className="lesson-summary">{item.summary}</div>
                                            </div>
                                            {idx !== currentLesson && !isLoading && <div className="click-indicator"><span>▶</span></div>}
                                            {isLoading && idx !== currentLesson && <div className="loading-indicator"><span>⏳</span></div>}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <div className="doubt-lecture">
                <input type="text" placeholder="Have a question? Ask your AI tutor..." value={doubt} onChange={(e) => setDoubt(e.target.value)} disabled={isDoubtLoading} onKeyPress={(e) => e.key === 'Enter' && handleAskDoubt()} />
                <button onClick={handleAskDoubt} disabled={isDoubtLoading || !lectureContent} className={isDoubtLoading ? "loading-btn" : ""}>
                    {isDoubtLoading ? (<><div className="loading-spinner"></div><span>Thinking...</span></>) : "Ask Doubt"}
                </button>
            </div>

            {doubtAnswers.length > 0 && (
                <div className="doubts-list">
                    <h4>💬 Q&A Session</h4>
                    <div className="doubt-answers">
                        {doubtAnswers.map((entry) => (
                            <div key={entry.id} className="doubt-entry">
                                <div className="doubt-question">
                                    <div className="question-header">
                                        <span className="question-icon">🤔</span>
                                        <span className="question-text">{entry.doubt}</span>
                                        <span className="question-time">{entry.timestamp}</span>
                                    </div>
                                </div>
                                <div className="doubt-answer">
                                    <div className="answer-header">
                                        <span className="answer-icon">💡</span>
                                        <span className="answer-label">AI Tutor:</span>
                                    </div>
                                    <div className="answer-content">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                            code({ inline, className, children, ...props }) {
                                                const match = /language-(\w+)/.exec(className || "");
                                                return !inline && match ? (
                                                    <SyntaxHighlighter style={coy} language={match[1]} PreTag="div" {...props}>
                                                        {String(children).replace(/\n$/, "")}
                                                    </SyntaxHighlighter>
                                                ) : (
                                                    <code className={className} {...props}>{children}</code>
                                                );
                                            },
                                        }}>
                                            {entry.answer}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showHistory && (
                <div className="history-sidebar">
                    <div className="history-header">
                        <h3>📚 Learning History</h3>
                        <div className="history-controls">
                            <button className="clear-history-btn" onClick={clearHistory} title="Clear all history">🗑️</button>
                            <button className="close-history-btn" onClick={() => setShowHistory(false)} title="Close history">✕</button>
                        </div>
                    </div>
                    <div className="history-content">
                        {learningHistory.length === 0 ? (
                            <div className="no-history">
                                <p>No learning history yet</p>
                                <p>Start a new course to see your progress here!</p>
                            </div>
                        ) : (
                            <div className="history-list">
                                {learningHistory.map((entry) => (
                                    <div key={entry.id} className="history-item" onClick={() => openHistoryLesson(entry)}>
                                        <div className="history-item-header">
                                            <h4>{entry.topic}</h4>
                                            <span className="history-time">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <p className="history-lesson">{entry.lessonTitle}</p>
                                        <div className="history-meta">
                                            <span className="history-lessons">{entry.syllabus?.length || 0} lessons</span>
                                            <span className="history-duration">{entry.duration > 0 ? `${Math.round(entry.duration / 60)}m` : 'Recent'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="floating-action-buttons">
                <button className="fab" onClick={() => {
                    setShowProgressDashboard(prev => {
                        const next = !prev;
                        if (next) setShowHistory(false);
                        return next;
                    });
                }} title={showProgressDashboard ? "Close Progress" : "Open Progress Dashboard"}>
                    {showProgressDashboard ? "✕" : "📊"}
                </button>
                <button
                    className="fab"
                    onClick={() => {
                        if (historyClickLockRef.current) return;
                        historyClickLockRef.current = true;
                        setTimeout(() => { historyClickLockRef.current = false; }, 400);
                        setShowHistory(prev => {
                            const next = !prev;
                            if (next) setShowProgressDashboard(false);
                            if (next) historyOpenedAtRef.current = Date.now();
                            return next;
                        });
                    }}
                    title={showHistory ? "Close Learning History" : "Open Learning History"}
                >
                    {showHistory ? "✕" : "📚"}
                </button>
            </div>

            {showQuiz && <Quiz lessonContent={lectureContent} topic={topic} lessonTitle={syllabus[currentLesson]?.title || `Lesson ${currentLesson + 1}`} lessonIndex={currentLesson} userId="default_user" onQuizComplete={handleQuizComplete} onClose={() => setShowQuiz(false)} />}
            {showProgressDashboard && <ProgressDashboard userId="default_user" onClose={() => setShowProgressDashboard(false)} />}

            <div className="footer">
                <Footer />
            </div>
        </div>
    );
};

export default Lecture;