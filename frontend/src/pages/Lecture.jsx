import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coy } from "react-syntax-highlighter/dist/esm/styles/prism";
import Quiz from "./Quiz";
import avatar from "../data/avatarfinal.mp4";
import ProgressDashboard from "./ProgressDashboard";
import "../scss/Lecture.scss";
// --- Helper Component for Icons ---
const Icon = ({ path }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
    </svg>
);

// Simple SVG diagram to visualize an array and indexes
const ConceptDiagram = ({ title = "Array Concept" }) => (
    <div className="concept-diagram" aria-label={`${title} diagram`}>
        <svg width="100%" height="120" viewBox="0 0 820 120" role="img">
            <rect x="10" y="10" width="800" height="100" rx="8" fill="#0f172a" stroke="#334155" />
            {Array.from({ length: 8 }).map((_, i) => (
                <g key={i}>
                    <rect x={20 + i * 100} y="20" width="90" height="60" fill="#1e293b" stroke="#475569" />
                    <text x={65 + i * 100} y="55" textAnchor="middle" fontSize="16" fill="#e2e8f0">{i * 2}</text>
                    <text x={65 + i * 100} y="95" textAnchor="middle" fontSize="12" fill="#94a3b8">{i}</text>
                </g>
            ))}
            <text x="20" y="18" fontSize="12" fill="#94a3b8">index</text>
        </svg>
    </div>
);

const SAMPLE_ENGLISH_MARKDOWN = `
# Data Structures and Algorithms

## Lesson 1: Arrays — Introduction and Basic Operations

An array is a contiguous block of memory that stores elements of the same type. Each element can be accessed in constant time using its index. Arrays are ideal when:

- You know the number of elements in advance
- You need fast random access by index
- Insertions/deletions happen mostly at the end

### Big-O at a Glance

- Access: O(1)
- Update: O(1)
- Push/Pop at end: O(1) amortized
- Insert/Delete at middle: O(n)

### Example (JavaScript)

\`\`\`js
const nums = [2, 4, 6, 8, 10];
// read
console.log(nums[2]); // -> 6
// update
nums[1] = 5; // [2, 5, 6, 8, 10]
// push
nums.push(12); // [2, 5, 6, 8, 10, 12]
// insert at index 2
nums.splice(2, 0, 3); // [2, 5, 3, 6, 8, 10, 12]
\`\`\`

### When Not to Use Arrays

If you need frequent insertions/deletions at the beginning or middle, consider a linked list or a dynamic structure like a deque.

### Recap

Arrays are simple, cache-friendly, and provide blazing-fast random access, but they are expensive for middle insertions and deletions.`;

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
    const [currentThreadId, setCurrentThreadId] = useState(null);
    const [streamingContent, setStreamingContent] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [isTTSEnabled, setIsTTSEnabled] = useState(true);
    const [isTTSPlaying, setIsTTSPlaying] = useState(false);
    const [isTTSPaused, setIsTTSPaused] = useState(false);
    const [ttsUtterance, setTtsUtterance] = useState(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(0.6); // 0.25x - 2.0x
    const liveLectureRef = useRef(null);
    const ttsStartedForStreamRef = useRef(false);
    const userNearBottomRef = useRef(true);
    const [isLiveMaximized, setIsLiveMaximized] = useState(false);

    // Load sample content action
    const loadSampleContent = () => {
        setLectureContent(SAMPLE_ENGLISH_MARKDOWN);
        setStreamingContent("");
        setCourseTitle("Data Structures and Algorithms");
        setTopic("Data Structures and Algorithms");
        setMode("single");
        if (isTTSEnabled) {
            speakText(SAMPLE_ENGLISH_MARKDOWN);
        }
    };

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

    const streamAbortRef = useRef(null);
    const streamMetaRef = useRef(null);
    const streamContentRef = useRef("");
    const streamingTimeoutRef = useRef(null);
    const streamingContentStateRef = useRef("");
    const lessonStreamStartedRef = useRef(false);

    // Load history on component mount
    useEffect(() => {
        loadHistory();
    }, []);

    // Cleanup streaming animation and TTS on unmount
    useEffect(() => {
        return () => {
            if (streamingTimeoutRef.current) {
                clearInterval(streamingTimeoutRef.current);
            }
            // Stop any ongoing TTS
            speechSynthesis.cancel();
        };
    }, []);

    // ✨ NEW: Function to show toast notifications
    const showToast = (message, type = "info") => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: "", type: "info" });
        }, 3000); // Hide after 3 seconds
    };

    // Keep a ref in sync with streamingContent for accurate diffs
    useEffect(() => {
        streamingContentStateRef.current = streamingContent;
    }, [streamingContent]);

    // 🎯 Robust letter-by-letter animation that APPENDS only new text
    const streamTextLetterByLetter = (fullText, onComplete) => {
        if (!fullText) return;

        // Clear any previous interval to avoid overlap/garble
        if (streamingTimeoutRef.current) {
            clearInterval(streamingTimeoutRef.current);
            streamingTimeoutRef.current = null;
        }

        const alreadyShown = streamingContentStateRef.current || "";
        let baseText;
        let delta;
        if (fullText.startsWith(alreadyShown)) {
            baseText = alreadyShown;
            delta = fullText.slice(alreadyShown.length);
        } else {
            // Reset if backend sent a fresh block
            baseText = "";
            delta = fullText;
            setStreamingContent("");
        }

        if (!delta) {
            if (onComplete) onComplete();
            return;
        }

        setIsStreaming(true);
        let currentIndex = 0;
        const stepDelayMs = Math.max(10, 50 / Math.max(0.25, Math.min(3, playbackSpeed)));
        const streamInterval = setInterval(() => {
            if (currentIndex < delta.length) {
                const nextChar = delta[currentIndex];
                setStreamingContent(prev => (prev || baseText) + nextChar);
                currentIndex++;
            } else {
                clearInterval(streamInterval);
                streamingTimeoutRef.current = null;
                setIsStreaming(false);
                if (onComplete) onComplete();

                // Auto-start TTS if not already started for this stream
                if (isTTSEnabled && fullText.trim() && !ttsStartedForStreamRef.current) {
                    ttsStartedForStreamRef.current = true;
                    setTimeout(() => {
                        speakText(fullText);
                    }, 200);
                }
            }
        }, stepDelayMs);

        streamingTimeoutRef.current = streamInterval;
    };

    // 🎤 NEW: Text-to-Speech Functions
    const speakText = (text) => {
        if (!text || !isTTSEnabled) return;
        
        // Stop any existing speech
        stopTTS();
        
        // Clean text for better speech
        const cleanText = text
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`[^`]+`/g, '') // Remove inline code
            .replace(/#{1,6}\s+/g, '') // Remove markdown headers
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
            .replace(/\*([^*]+)\*/g, '$1') // Remove italic
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
            .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
            .trim();
        
        if (!cleanText) return;
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Configure speech settings
        utterance.rate = Math.max(0.5, Math.min(2.0, playbackSpeed));
        utterance.pitch = 1;
        utterance.volume = 0.8;
        utterance.lang = 'en-US';
        
        // Event handlers
        utterance.onstart = () => {
            setIsTTSPlaying(true);
            setIsTTSPaused(false);
        };
        
        utterance.onend = () => {
            setIsTTSPlaying(false);
            setIsTTSPaused(false);
            setTtsUtterance(null);
        };
        
        utterance.onerror = (event) => {
            console.error('TTS Error:', event.error);
            setIsTTSPlaying(false);
            setIsTTSPaused(false);
            setTtsUtterance(null);
        };
        
        setTtsUtterance(utterance);
        speechSynthesis.speak(utterance);
    };

    const pauseTTS = () => {
        if (speechSynthesis.speaking && !speechSynthesis.paused) {
            speechSynthesis.pause();
            setIsTTSPaused(true);
        }
    };

    const resumeTTS = () => {
        if (speechSynthesis.paused) {
            speechSynthesis.resume();
            setIsTTSPaused(false);
        }
    };

    const stopTTS = () => {
        speechSynthesis.cancel();
        setIsTTSPlaying(false);
        setIsTTSPaused(false);
        setTtsUtterance(null);
    };

    const toggleTTS = () => {
        if (isTTSPlaying) {
            if (isTTSPaused) {
                resumeTTS();
            } else {
                pauseTTS();
            }
        } else if (lectureContent || streamingContent) {
            speakText(streamingContent || lectureContent);
        }
    };

    const toggleTTSEngine = () => {
        if (isTTSEnabled) {
            stopTTS();
            setIsTTSEnabled(false);
            showToast("Text-to-Speech disabled", "info");
        } else {
            setIsTTSEnabled(true);
            showToast("Text-to-Speech enabled", "success");
        }
    };

    // Smooth auto-scroll for live lecture while streaming, but only if user is near bottom
    useEffect(() => {
        if (!liveLectureRef.current) return;
        if (isStreaming && userNearBottomRef.current) {
            // Smoothly follow new content
            const el = liveLectureRef.current;
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
    }, [streamingContent, isStreaming]);

    const handleLiveScroll = () => {
        const el = liveLectureRef.current;
        if (!el) return;
        const threshold = 80; // px from bottom considered "near"
        userNearBottomRef.current = (el.scrollTop + el.clientHeight) >= (el.scrollHeight - threshold);
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
        // Clear streaming animation
        if (streamingTimeoutRef.current) {
            clearInterval(streamingTimeoutRef.current);
            streamingTimeoutRef.current = null;
        }
        setIsStreaming(false);
        setStreamingContent("");
        
        // Stop any ongoing TTS
        stopTTS();
        if (!customQuery) {
            // 🎯 FIXED: Clear all state when starting a new course search
            setLectureContent("");
            setSyllabus([]);
            setTopic("");
            setMode("");
            setCurrentLesson(0);
            setCourseTitle("");
            setDoubtAnswers([]);
            setDoubtsList([]);
        }
        try {
            const controller = new AbortController();
            streamAbortRef.current = controller;
            streamMetaRef.current = null;
            streamContentRef.current = "";
            lessonStreamStartedRef.current = false;
            ttsStartedForStreamRef.current = false;

            // 🎯 FIXED: Generate unique thread_id for each new course search
            const uniqueThreadId = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            setCurrentThreadId(uniqueThreadId);
            const response = await fetch("https://sih-backend-4fcb.onrender.com/course-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, thread_id: uniqueThreadId }),
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
                            // Start first lesson stream ASAP without waiting for 'done'
                            if (!lessonStreamStartedRef.current && (evt.mode === "course") && Array.isArray(evt.syllabus) && evt.syllabus.length > 0) {
                                lessonStreamStartedRef.current = true;
                                const firstLessonTitle = evt.syllabus[0]?.title || `Lesson 1`;
                                // Abort the course-stream to free up connection; lesson stream contains the actual content
                                try { controller.abort(); } catch (e) {}
                                streamLessonContent(theTopic, 0, firstLessonTitle);
                                return; // stop processing further course-stream lines
                            }
                        } else if (evt.type === "chunk") {
                            // Ignore course-level chunks if lesson stream is/will be started
                            if (!lessonStreamStartedRef.current) {
                            streamContentRef.current += (evt.markdown || "") + "\n\n";
                            const newContent = streamContentRef.current;
                            streamTextLetterByLetter(newContent);
                            }
                        } else if (evt.type === "done") {
                            // No-op: we already started the lesson stream on meta
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

    // 🎯 NEW: Stream lesson content specifically
    const streamLessonContent = async (topic, lessonIndex, lessonTitle) => {
        setIsLoading(true);
        // Reset previous content and streaming buffers
        setLectureContent("");
        setStreamingContent("");
        streamContentRef.current = "";
        
        try {
            const controller = new AbortController();
            streamAbortRef.current = controller;
            ttsStartedForStreamRef.current = false;

            const response = await fetch("https://sih-backend-4fcb.onrender.com/lesson-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: topic,
                    lesson_index: lessonIndex,
                    lesson_title: lessonTitle
                }),
                signal: controller.signal
            });

            if (!response.ok || !response.body) throw new Error("Failed to start lesson stream");
            
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
                            // Update lesson metadata
                            setTopic(evt.topic);
                            setCourseTitle(evt.topic);
                            setCurrentLesson(evt.lesson_index);
                        } else if (evt.type === "chunk") {
                            // Append-only accumulation using refs/state-safe updates
                            const addition = (evt.markdown || "");
                            streamContentRef.current += addition;
                            setLectureContent(prev => (prev || "") + addition);
                            streamTextLetterByLetter(streamContentRef.current);
                        } else if (evt.type === "done") {
                            // Lesson streaming complete - save to history
                            const lessonTitle = syllabus[currentLesson]?.title || `Lesson ${currentLesson + 1}`;
                            // Ensure final full text is set
                            if (streamContentRef.current) {
                                setLectureContent(streamContentRef.current);
                            }
                            saveToHistory({
                                topic: topic || courseTitle,
                                lessonTitle: lessonTitle,
                                content: streamContentRef.current || lectureContent,
                                syllabus: syllabus,
                                currentLesson: currentLesson
                            });
                            showToast("Lesson loaded successfully!", "success");
                        } else if (evt.type === "error") {
                            showToast("Error: " + (evt.error || "Unknown error"), "error");
                        }
                    } catch (e) { /* ignore parse errors per line */ }
                }
            };

            // Read loop
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                processText(decoder.decode(value, { stream: true }));
            }
            
            // Flush any remaining buffered text
            const tail = decoder.decode();
            if (tail) processText(tail);
        } catch (error) {
            if (error?.name !== 'AbortError') {
                console.error("Lesson stream error: ", error);
                showToast("Failed to load lesson content.", "error");
            }
        } finally {
            setIsLoading(false);
            streamAbortRef.current = null;
        }
    };

    // Navigation
    const handleNext = () => {
        if (mode === "course" && syllabus.length > 0) {
            const nextLesson = Math.min(currentLesson + 1, syllabus.length - 1);
            if (nextLesson !== currentLesson) {
                setCurrentLesson(nextLesson);
                const lessonTitle = syllabus[nextLesson]?.title || `Lesson ${nextLesson + 1}`;
                streamLessonContent(topic || courseTitle, nextLesson, lessonTitle);
            }
        } else {
            handleSearch("next");
        }
    };
    
    const handlePrevious = () => {
        if (mode === "course" && syllabus.length > 0) {
            const prevLesson = Math.max(currentLesson - 1, 0);
            if (prevLesson !== currentLesson) {
                setCurrentLesson(prevLesson);
                const lessonTitle = syllabus[prevLesson]?.title || `Lesson ${prevLesson + 1}`;
                streamLessonContent(topic || courseTitle, prevLesson, lessonTitle);
            }
        } else {
            handleSearch("previous");
        }
    };
    
    const handleRepeat = () => {
        if (mode === "course" && syllabus.length > 0) {
            const lessonTitle = syllabus[currentLesson]?.title || `Lesson ${currentLesson + 1}`;
            streamLessonContent(topic || courseTitle, currentLesson, lessonTitle);
        } else {
            handleSearch("repeat");
        }
    };
    
    const handleLessonClick = (lessonIndex) => {
        if (mode === "course" && syllabus.length > 0) {
            setCurrentLesson(lessonIndex);
            const lessonTitle = syllabus[lessonIndex]?.title || `Lesson ${lessonIndex + 1}`;
            streamLessonContent(topic || courseTitle, lessonIndex, lessonTitle);
        } else {
            handleSearch(`goto ${lessonIndex + 1}`);
        }
    };

    // 📥 Download Notes
    const handleDownloadNotes = async () => {
        if (!lectureContent) {
            showToast("No lesson content to download!", "warning");
            return;
        }
        setIsDownloading(true);
        try {
            const response = await fetch("https://sih-backend-4fcb.onrender.com/download-notes", {
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
            const response = await fetch("https://sih-backend-4fcb.onrender.com/doubt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    doubt: currentDoubt,
                    lesson_context: lectureContent,
                    topic: topic || courseTitle,
                    thread_id: currentThreadId || "1"
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

                <div className={`lecture-area ${'with-syllabus'} ${isLiveMaximized ? 'live-maximized' : ''}`}>
                    <div className={`live-lecture ${isLiveMaximized ? 'maximized' : ''}`} ref={liveLectureRef} onScroll={handleLiveScroll}>
                        {courseTitle ? (
                            <>
                                {(lectureContent || streamingContent) ? (
                                    <div className="lecture-details">
                                        <ConceptDiagram title={topic || courseTitle} />
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
                                            {streamingContent || lectureContent}
                                        </ReactMarkdown>
                                        {isStreaming && <div className="streaming-cursor">|</div>}
                                        <div className="lecture-controls sticky">
                                            <button className="nav-btn prev-btn icon-only" onClick={handlePrevious} disabled={isLoading || mode !== "course" || currentLesson === 0} title="Previous">
                                                {isLoading ? <div className="loading-spinner small"></div> : <span className="btn-icon">⬅️</span>}
                                            </button>
                                            <button className="nav-btn repeat-btn icon-only" onClick={handleRepeat} disabled={isLoading || mode !== "course" || syllabus.length === 0} title="Repeat">
                                                {isLoading ? <div className="loading-spinner small"></div> : <span className="btn-icon">🔁</span>}
                                            </button>
                                            
                                            {/* 🎤 TTS Controls */}
                                            <button 
                                                className={`nav-btn tts-toggle-btn icon-only ${isTTSEnabled ? 'enabled' : 'disabled'}`} 
                                                onClick={toggleTTSEngine}
                                                title={isTTSEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
                                            >
                                                <span className="btn-icon">{isTTSEnabled ? "🔊" : "🔇"}</span>
                                            </button>
                                            
                                            {isTTSEnabled && (lectureContent || streamingContent) && (
                                                <button 
                                                    className={`nav-btn tts-play-btn icon-only ${isTTSPlaying ? (isTTSPaused ? 'paused' : 'playing') : 'stopped'}`} 
                                                    onClick={toggleTTS}
                                                    title={isTTSPlaying ? (isTTSPaused ? "Resume" : "Pause") : "Speak"}
                                                >
                                                    <span className="btn-icon">
                                                        {isTTSPlaying ? (isTTSPaused ? "▶️" : "⏸️") : "🎤"}
                                                    </span>
                                                </button>
                                            )}

                                            {/* Playback Speed Control */}
                                            <div className="speed-control" title="Playback speed">
                                                <span className="speed-label">⏱️</span>
                                                <input
                                                    type="range"
                                                    min="0.25"
                                                    max="2"
                                                    step="0.05"
                                                    value={playbackSpeed}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        setPlaybackSpeed(val);
                                                        // Update live TTS rate if speaking
                                                        if (ttsUtterance && speechSynthesis.speaking) {
                                                            try {
                                                                speechSynthesis.cancel();
                                                                // Restart at new speed using latest text
                                                                const text = (streamingContent || lectureContent || '').toString();
                                                                if (text) speakText(text);
                                                            } catch {}
                                                        }
                                                    }}
                                                />
                                                <span className="speed-value">{playbackSpeed.toFixed(2)}x</span>
                                            </div>

                                            {/* Load a clean, formatted English sample */}
                                            <button className="nav-btn icon-only" onClick={loadSampleContent} title="Use Sample Content">
                                                <span className="btn-icon">📝</span>
                                            </button>
                                            
                                            <button className="nav-btn download-btn icon-only" onClick={handleDownloadNotes} disabled={isDownloading || !lectureContent} title="Download Notes">
                                                {isDownloading ? <div className="loading-spinner small"></div> : <span className="btn-icon">📥</span>}
                                            </button>
                                            <button className="nav-btn quiz-btn icon-only" onClick={handleStartQuiz} disabled={!lectureContent} title="Take Quiz">
                                                <span className="btn-icon">🎯</span>
                                            </button>
                                            <button className="nav-btn next-btn icon-only" onClick={handleNext} disabled={isLoading || mode !== "course" || currentLesson >= syllabus.length - 1} title="Next">
                                                {isLoading ? <div className="loading-spinner small"></div> : <span className="btn-icon">➡️</span>}
                                            </button>

                                            {/* Maximize / Minimize live lecture */}
                                            <button className="nav-btn icon-only maximize-btn" onClick={() => setIsLiveMaximized(v => !v)} title={isLiveMaximized ? "Minimize" : "Maximize"}>
                                                <span className="btn-icon">{isLiveMaximized ? "🗗" : "⛶"}</span>
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

                    <div className="right-sidebar">
                        {lectureContent && (
                            <div className="avatar-container">
                                <video
                                    src={avatar}
                                    className="avatar-video"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                />
                            </div>
                        )}

                            <div className="syllabus-sidebar">
                                <div className="syllabus-header">
                                    <h3>📚 Syllabus</h3>
                                <span className="course-title">{topic || 'Your Course'}</span>
                                </div>
                                <div className="syllabus-content">
                                {syllabus.length === 0 ? (
                                    isLoading ? (
                                        <div className="syllabus-skeleton">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="skeleton-item">
                                                    <div className="skeleton-number" />
                                                    <div className="skeleton-lines">
                                                        <div className="skeleton-line short" />
                                                        <div className="skeleton-line" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="syllabus-empty">Start a course to see the lessons here.</div>
                                    )
                                ) : (
                                    <ol>
                                        {syllabus.map((item, idx) => (
                                            <li
                                                key={idx}
                                                className={`syllabus-item ${idx === currentLesson ? "active" : ""} ${idx !== currentLesson ? "clickable" : ""} ${isLoading ? "loading" : ""}`}
                                                onClick={() => idx !== currentLesson && !isLoading && handleLessonClick(idx)}
                                            >
                                                <div className="lesson-number">
                                                    {isLoading && idx !== currentLesson ? (
                                                        <div className="loading-spinner tiny"></div>
                                                    ) : (
                                                        idx + 1
                                                    )}
                                                </div>
                                                <div className="lesson-content-details">
                                                    <div className="lesson-title">{item.title}</div>
                                                    <div className="lesson-summary">{item.summary}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>
                            {lectureContent && (
                                <div className="syllabus-footer">
                                    <div className="avatar-mini">
                                        <video
                                            src={avatar}
                                            className="avatar-video"
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                        />
                                </div>
                            </div>
                        )}
                        </div>
                    </div>
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
                <>
                    <div className={`history-sidebar ${showHistory ? 'open' : ''}`}>
                        <div className="history-header">
                            <h3>📚 Learning History</h3>
                            <div className="history-controls">
                                <button className="clear-history-btn" onClick={clearHistory} title="Clear all history">🗑️</button>
                                <button className="close-history-btn" onClick={() => {
                                    if (Date.now() - historyOpenedAtRef.current < 700) return;
                                    setShowHistory(false);
                                }} title="Close history">✕</button>
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
                    <div 
                        className={`sidebar-overlay ${showHistory ? 'open' : ''}`}
                        onClick={() => setShowHistory(false)}
                    ></div>
                </>
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
                        setTimeout(() => { historyClickLockRef.current = false; }, 800);
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