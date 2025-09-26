from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from backend.core import workflow
import os
import tempfile
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from pymongo import MongoClient
from dotenv import load_dotenv
import json
from bson import ObjectId
import subprocess
import tempfile
import os
import sys
import signal
import threading
import time
from backend.roadmap import roadmap_workflow

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Load environment variables
load_dotenv()

# MongoDB connection
client = MongoClient(os.getenv("MONGO_CLIENT"))
db = client["learning_platform"]

# Custom JSON encoder for MongoDB objects
class MongoDBEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        elif isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

class LectureQuery(BaseModel):
    query: str
    thread_id: str = "1"

class DoubtQuery(BaseModel):
    doubt: str
    lesson_context: str
    topic: str
    thread_id: str = "1"

class PDFQuery(BaseModel):
    lesson_content: str
    topic: str
    lesson_title: str

class QuizGenerationRequest(BaseModel):
    lesson_content: str
    topic: str
    lesson_title: str
    lesson_index: int
    user_id: str = "default_user"

class QuizSubmission(BaseModel):
    quiz_id: str
    user_id: str = "default_user"
    answers: List[Dict[str, Any]]
    time_spent: int  # in seconds
    lesson_index: int
    topic: str

class PerformanceRequest(BaseModel):
    user_id: str = "default_user"
    topic: Optional[str] = None

class CodeExecutionRequest(BaseModel):
    code: str
    language: str = "python"
    input_data: Optional[str] = None
    timeout: int = 5  # seconds

class skillRequest(BaseModel):
    skill: str

@app.post("/roadmap")
def get_roadmap(request: skillRequest):
    state = {"skill": request.skill}
    result = roadmap_workflow.invoke(state, config={"configurable": {"thread_id": "1"}})
    return {"roadmap": result["roadmap"]}

@app.post("/course")
def course(stu_query: LectureQuery):
    query = stu_query.query
    thread_id = stu_query.thread_id

    config = {"configurable": {"thread_id": thread_id}}
    state = {"query": query}

    try:
        result = workflow.invoke(state, config=config)
        return {
            "success": True, 
            "response": result.get("response", ""),
            "explanation": result.get("explanation", ""),
            "mode": result.get("mode", ""),
            "topic": result.get("topic", ""),
            "syllabus": result.get("syllabus", ""),
            "current_lesson": result.get("current_lesson", ""),
            "query": result.get("query", "")
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def _chunk_markdown_preserving_blocks(text: str, max_chunk_len: int = 1500):
    """Yield markdown chunks without breaking headings or fenced code blocks."""
    if not text:
        return
    lines = text.split('\n')
    chunks = []
    buf = []
    in_code = False
    fence = None
    current_len = 0
    def flush():
        nonlocal buf, current_len
        if buf:
            chunk = '\n'.join(buf).strip('\n')
            if chunk:
                chunks.append(chunk)
            buf = []
            current_len = 0
    for line in lines:
        # detect fenced code start/end
        if re.match(r"^```", line):
            in_code = not in_code
            fence = '```' if in_code else None
            buf.append(line)
            current_len += len(line) + 1
            continue
        # if starting a new top-level block (heading or hr) and buffer has content, flush first
        if not in_code and (re.match(r"^#{1,6}\\s", line) or re.match(r"^---+$", line.strip())):
            flush()
            buf.append(line)
            current_len += len(line) + 1
            continue
        # normal line accumulation
        buf.append(line)
        current_len += len(line) + 1
        # split only on blank line when not inside code and chunk too large
        if not in_code and current_len >= max_chunk_len and line.strip() == "":
            flush()
    flush()
    for c in chunks:
        yield c

@app.post("/course-stream")
def course_stream(stu_query: LectureQuery):
    query = stu_query.query
    thread_id = stu_query.thread_id

    config = {"configurable": {"thread_id": thread_id}}
    state = {"query": query}

    def generator():
        try:
            result = workflow.invoke(state, config=config)
            meta = {
                "type": "meta",
                "success": True,
                "mode": result.get("mode", ""),
                "topic": result.get("topic", ""),
                "syllabus": result.get("syllabus", []),
                "current_lesson": result.get("current_lesson", 0),
                "query": result.get("query", query)
            }
            yield json.dumps(meta) + "\n"

            full_markdown = result.get("response", "")
            # Stream markdown in safe chunks
            for md in _chunk_markdown_preserving_blocks(full_markdown):
                yield json.dumps({"type": "chunk", "markdown": md}) + "\n"
            yield json.dumps({"type": "done"}) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "error": str(e)}) + "\n"

    return StreamingResponse(generator(), media_type="application/x-ndjson")

@app.post("/doubt")
def handle_doubt(doubt_query: DoubtQuery):
    doubt = doubt_query.doubt
    lesson_context = doubt_query.lesson_context
    topic = doubt_query.topic
    thread_id = doubt_query.thread_id

    try:
        # Create a context-aware doubt prompt
        doubt_prompt = f"""
        You are an expert teacher helping a student with their doubt. 
        The student is currently learning about: {topic}
        
        Current lesson content:
        {lesson_context}
        
        Student's doubt: {doubt}
        
        Please provide a helpful, detailed answer that:
        1. Directly addresses the student's doubt
        2. References the current lesson content when relevant
        3. Provides clear explanations with examples if needed
        4. Uses a supportive, teaching tone
        
        Keep your answer focused and practical, drawing from the lesson context when possible.
        """
        
        # Use the existing workflow but with the doubt prompt
        config = {"configurable": {"thread_id": f"{thread_id}_doubt"}}
        state = {"query": doubt_prompt}
        
        result = workflow.invoke(state, config=config)
        
        return {
            "success": True,
            "answer": result.get("response", ""),
            "doubt": doubt,
            "topic": topic
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def clean_markdown_for_pdf(text):
    """Clean markdown text for PDF generation"""
    # Remove markdown headers and convert to plain text
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Remove markdown bold/italic
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    # Remove markdown code blocks
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    # Remove markdown links
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Remove markdown lists
    text = re.sub(r'^\s*[-*+]\s+', '• ', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    # Clean up extra whitespace
    text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
    return text.strip()

def create_pdf(lesson_content, topic, lesson_title):
    """Create a PDF from lesson content"""
    # Create a temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    temp_file.close()
    
    # Create PDF document
    doc = SimpleDocTemplate(temp_file.name, pagesize=A4, 
                          rightMargin=72, leftMargin=72, 
                          topMargin=72, bottomMargin=18)
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Create custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.darkblue
    )
    
    topic_style = ParagraphStyle(
        'CustomTopic',
        parent=styles['Heading2'],
        fontSize=18,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.darkgreen
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        spaceBefore=20,
        textColor=colors.darkblue
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubHeading',
        parent=styles['Heading3'],
        fontSize=14,
        spaceAfter=8,
        spaceBefore=12,
        textColor=colors.darkblue
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=6,
        alignment=TA_JUSTIFY,
        leading=14
    )
    
    code_style = ParagraphStyle(
        'CustomCode',
        parent=styles['Code'],
        fontSize=9,
        spaceAfter=6,
        spaceBefore=6,
        leftIndent=20,
        rightIndent=20,
        backColor=colors.lightgrey
    )
    
    # Clean the content
    cleaned_content = clean_markdown_for_pdf(lesson_content)
    
    # Build the PDF content
    story = []
    
    # Add title
    story.append(Paragraph("GyaanSetu AI - Learning Notes", title_style))
    story.append(Spacer(1, 12))
    
    # Add topic
    story.append(Paragraph(f"Course: {topic}", topic_style))
    story.append(Spacer(1, 12))
    
    # Add lesson title
    story.append(Paragraph(f"Lesson: {lesson_title}", heading_style))
    story.append(Spacer(1, 20))
    
    # Add content
    lines = cleaned_content.split('\n')
    current_code_block = []
    in_code_block = False
    
    for line in lines:
        line = line.strip()
        
        if not line:
            if current_code_block:
                # End code block
                code_text = '\n'.join(current_code_block)
                story.append(Paragraph(f"<font name='Courier'>{code_text}</font>", code_style))
                current_code_block = []
                in_code_block = False
            story.append(Spacer(1, 6))
            continue
            
        # Check for headings
        if line.startswith('Lesson') or line.startswith('###') or line.startswith('##') or line.startswith('#'):
            if current_code_block:
                code_text = '\n'.join(current_code_block)
                story.append(Paragraph(f"<font name='Courier'>{code_text}</font>", code_style))
                current_code_block = []
                in_code_block = False
            
            # Clean heading
            heading = re.sub(r'^#+\s*', '', line)
            if 'Lesson' in heading or '###' in line:
                story.append(Paragraph(heading, heading_style))
            else:
                story.append(Paragraph(heading, subheading_style))
        elif line.startswith('•') or line.startswith('-') or line.startswith('*'):
            if current_code_block:
                code_text = '\n'.join(current_code_block)
                story.append(Paragraph(f"<font name='Courier'>{code_text}</font>", code_style))
                current_code_block = []
                in_code_block = False
            story.append(Paragraph(f"• {line[1:].strip()}", body_style))
        elif line.startswith('```') or line.startswith('`'):
            if not in_code_block:
                in_code_block = True
            else:
                in_code_block = False
        elif in_code_block:
            current_code_block.append(line)
        else:
            if current_code_block:
                code_text = '\n'.join(current_code_block)
                story.append(Paragraph(f"<font name='Courier'>{code_text}</font>", code_style))
                current_code_block = []
                in_code_block = False
            story.append(Paragraph(line, body_style))
    
    # Handle any remaining code block
    if current_code_block:
        code_text = '\n'.join(current_code_block)
        story.append(Paragraph(f"<font name='Courier'>{code_text}</font>", code_style))
    
    # Add footer
    story.append(PageBreak())
    story.append(Paragraph("Generated by GyaanSetu AI", 
                          ParagraphStyle('Footer', parent=styles['Normal'], 
                                       fontSize=10, alignment=TA_CENTER, 
                                       textColor=colors.grey)))
    
    # Build PDF
    doc.build(story)
    
    return temp_file.name

@app.post("/download-notes")
def download_notes(pdf_query: PDFQuery):
    """Generate and download PDF notes for the current lesson"""
    try:
        # Create PDF
        pdf_path = create_pdf(
            pdf_query.lesson_content,
            pdf_query.topic,
            pdf_query.lesson_title
        )
        
        # Generate filename
        safe_topic = re.sub(r'[^\w\s-]', '', pdf_query.topic).strip()
        safe_lesson = re.sub(r'[^\w\s-]', '', pdf_query.lesson_title).strip()
        filename = f"{safe_topic}_{safe_lesson}_notes.pdf"
        
        return FileResponse(
            path=pdf_path,
            filename=filename,
            media_type='application/pdf',
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        return {"success": False, "error": str(e)}

# Quiz Generation Function
def generate_quiz_questions(lesson_content: str, topic: str, lesson_title: str) -> List[Dict[str, Any]]:
    """Generate quiz questions using LLM based on lesson content"""
    try:
        from backend.core import model
        
        quiz_prompt = f"""
        You are an expert educator creating a comprehensive quiz for the lesson: "{lesson_title}" in the course "{topic}".

        Lesson Content:
        {lesson_content}

        Create 3-5 quiz questions that test understanding of this lesson. Include both multiple choice questions (MCQs) and coding questions where appropriate.

        For each question, provide:
        1. Question text (clear and specific)
        2. Question type ("mcq" or "coding")
        3. Options (for MCQ) or expected output (for coding)
        4. Correct answer
        5. Explanation (why this answer is correct)
        6. Difficulty level ("easy", "medium", "hard")

        Return ONLY valid JSON in this format:
        [
            {{
                "question": "What is the primary purpose of...?",
                "type": "mcq",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": 0,
                "explanation": "This is correct because...",
                "difficulty": "medium"
            }},
            {{
                "question": "Write a function that...",
                "type": "coding",
                "expected_output": "Expected result",
                "correct_answer": "def example(): return 'result'",
                "explanation": "This solution works because...",
                "difficulty": "hard"
            }}
        ]

        Focus on the most important concepts from the lesson. Make questions practical and applicable.
        """
        
        response = model.invoke(quiz_prompt)
        questions = json.loads(response.content.strip())
        
        # Validate and clean questions
        validated_questions = []
        for q in questions:
            if isinstance(q, dict) and 'question' in q and 'type' in q:
                validated_questions.append({
                    'question': q['question'],
                    'type': q.get('type', 'mcq'),
                    'options': q.get('options', []) if q.get('type') == 'mcq' else None,
                    'expected_output': q.get('expected_output') if q.get('type') == 'coding' else None,
                    'correct_answer': q.get('correct_answer'),
                    'explanation': q.get('explanation', ''),
                    'difficulty': q.get('difficulty', 'medium')
                })
        
        return validated_questions[:5]  # Limit to 5 questions
        
    except Exception as e:
        print(f"Error generating quiz: {e}")
        # Fallback questions
        return [
            {
                "question": f"What is the main concept covered in '{lesson_title}'?",
                "type": "mcq",
                "options": ["Basic understanding", "Advanced concept", "Practical application", "All of the above"],
                "correct_answer": 3,
                "explanation": "This lesson covers multiple aspects of the topic.",
                "difficulty": "easy"
            }
        ]

@app.post("/generate-quiz")
def generate_quiz(request: QuizGenerationRequest):
    """Generate quiz questions for a lesson"""
    try:
        questions = generate_quiz_questions(
            request.lesson_content,
            request.topic,
            request.lesson_title
        )
        
        # Save quiz to database
        quiz_doc = {
            "quiz_id": f"{request.user_id}_{request.topic}_{request.lesson_index}_{datetime.now().timestamp()}",
            "user_id": request.user_id,
            "topic": request.topic,
            "lesson_title": request.lesson_title,
            "lesson_index": request.lesson_index,
            "questions": questions,
            "created_at": datetime.now(),
            "total_questions": len(questions)
        }
        
        db.quizzes.insert_one(quiz_doc)
        
        return {
            "success": True,
            "quiz_id": quiz_doc["quiz_id"],
            "questions": questions,
            "total_questions": len(questions)
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/submit-quiz")
def submit_quiz(submission: QuizSubmission):
    """Submit quiz answers and calculate score"""
    try:
        # Get the quiz from database
        quiz = db.quizzes.find_one({"quiz_id": submission.quiz_id})
        if not quiz:
            return {"success": False, "error": "Quiz not found"}
        
        questions = quiz["questions"]
        total_questions = len(questions)
        correct_answers = 0
        detailed_results = []
        
        # Calculate score
        for i, answer in enumerate(submission.answers):
            if i < len(questions):
                question = questions[i]
                user_answer = answer.get("answer")
                correct_answer = question.get("correct_answer")
                
                is_correct = False
                if question["type"] == "mcq":
                    is_correct = user_answer == correct_answer
                elif question["type"] == "coding":
                    # For coding questions, we'll do basic string comparison
                    # In a real implementation, you might want to run the code
                    is_correct = str(user_answer).strip().lower() == str(correct_answer).strip().lower()
                
                if is_correct:
                    correct_answers += 1
                
                detailed_results.append({
                    "question_index": i,
                    "question": question["question"],
                    "user_answer": user_answer,
                    "correct_answer": correct_answer,
                    "is_correct": is_correct,
                    "explanation": question.get("explanation", "")
                })
        
        score_percentage = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
        
        # Save quiz attempt
        attempt_doc = {
            "quiz_id": submission.quiz_id,
            "user_id": submission.user_id,
            "topic": submission.topic,
            "lesson_index": submission.lesson_index,
            "score": score_percentage,
            "correct_answers": correct_answers,
            "total_questions": total_questions,
            "time_spent": submission.time_spent,
            "answers": submission.answers,
            "detailed_results": detailed_results,
            "submitted_at": datetime.now()
        }
        
        db.quiz_attempts.insert_one(attempt_doc)
        
        # Determine recommendation based on score
        recommendation = "continue"
        if score_percentage < 50:
            recommendation = "review"
        elif score_percentage >= 80:
            recommendation = "fast_track"
        
        return {
            "success": True,
            "score": score_percentage,
            "correct_answers": correct_answers,
            "total_questions": total_questions,
            "detailed_results": detailed_results,
            "recommendation": recommendation,
            "time_spent": submission.time_spent
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/performance-dashboard")
def get_performance_dashboard(request: PerformanceRequest):
    """Get user's performance dashboard data"""
    try:
        user_id = request.user_id
        topic_filter = {"topic": request.topic} if request.topic else {}
        
        # Get all quiz attempts for the user
        attempts_cursor = db.quiz_attempts.find({
            "user_id": user_id,
            **topic_filter
        }).sort("submitted_at", -1)
        
        attempts = []
        for attempt in attempts_cursor:
            # Convert ObjectId and datetime to string for JSON serialization
            if '_id' in attempt:
                attempt['_id'] = str(attempt['_id'])
            if 'submitted_at' in attempt and isinstance(attempt['submitted_at'], datetime):
                attempt['submitted_at'] = attempt['submitted_at'].isoformat()
            attempts.append(attempt)
        
        if not attempts:
            return {
                "success": True,
                "total_quizzes": 0,
                "average_score": 0,
                "completion_percentage": 0,
                "weak_areas": [],
                "strong_areas": [],
                "recent_attempts": [],
                "recommendations": []
            }
        
        # Calculate statistics
        total_quizzes = len(attempts)
        average_score = sum(attempt["score"] for attempt in attempts) / total_quizzes
        
        # Get unique topics
        topics = list(set(attempt["topic"] for attempt in attempts))
        
        # Calculate topic-wise performance
        topic_scores = {}
        for topic in topics:
            topic_attempts = [a for a in attempts if a["topic"] == topic]
            topic_scores[topic] = sum(a["score"] for a in topic_attempts) / len(topic_attempts)
        
        # Identify weak and strong areas
        weak_areas = [topic for topic, score in topic_scores.items() if score < 60]
        strong_areas = [topic for topic, score in topic_scores.items() if score >= 80]
        
        # Calculate completion percentage (assuming each topic has multiple lessons)
        # This is a simplified calculation - in reality you'd track lesson completion
        completion_percentage = min(100, (total_quizzes * 10))  # Simplified calculation
        
        # Get recent attempts
        recent_attempts = attempts[:5]  # Last 5 attempts
        
        # Generate recommendations
        recommendations = []
        if average_score < 50:
            recommendations.append("Consider reviewing previous lessons before moving forward")
        elif average_score >= 80:
            recommendations.append("Great progress! You're ready for advanced topics")
        
        if weak_areas:
            recommendations.append(f"Focus on improving: {', '.join(weak_areas)}")
        
        return {
            "success": True,
            "total_quizzes": total_quizzes,
            "average_score": round(average_score, 2),
            "completion_percentage": completion_percentage,
            "weak_areas": weak_areas,
            "strong_areas": strong_areas,
            "recent_attempts": recent_attempts,
            "recommendations": recommendations,
            "topic_scores": topic_scores
        }
        
    except Exception as e:
        print(f"Error in performance dashboard: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

# Secure Code Execution Functions
def execute_code_safely(code: str, language: str, input_data: str = None, timeout: int = 5):
    """Execute code safely with timeout and resource limits"""
    try:
        # Create temporary files
        with tempfile.NamedTemporaryFile(mode='w', suffix=get_file_extension(language), delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Prepare command based on language
            if language.lower() == "python":
                cmd = [sys.executable, temp_file]
            elif language.lower() == "javascript":
                cmd = ["node", temp_file]
            elif language.lower() == "java":
                # Compile first, then run
                class_name = "Main"
                compile_cmd = ["javac", temp_file]
                compile_result = subprocess.run(compile_cmd, capture_output=True, text=True, timeout=timeout)
                if compile_result.returncode != 0:
                    return {
                        "success": False,
                        "output": "",
                        "error": f"Compilation error: {compile_result.stderr}",
                        "execution_time": 0
                    }
                cmd = ["java", "-cp", os.path.dirname(temp_file), class_name]
            else:
                return {
                    "success": False,
                    "output": "",
                    "error": f"Unsupported language: {language}",
                    "execution_time": 0
                }
            
            # Execute with timeout
            start_time = time.time()
            result = subprocess.run(
                cmd,
                input=input_data,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=os.path.dirname(temp_file)
            )
            execution_time = time.time() - start_time
            
            # Clean up
            os.unlink(temp_file)
            if language.lower() == "java":
                class_file = temp_file.replace('.java', '.class')
                if os.path.exists(class_file):
                    os.unlink(class_file)
            
            return {
                "success": True,
                "output": result.stdout,
                "error": result.stderr if result.stderr else "",
                "return_code": result.returncode,
                "execution_time": round(execution_time, 3)
            }
            
        except subprocess.TimeoutExpired:
            os.unlink(temp_file)
            return {
                "success": False,
                "output": "",
                "error": f"Code execution timed out after {timeout} seconds",
                "execution_time": timeout
            }
        except Exception as e:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
            return {
                "success": False,
                "output": "",
                "error": f"Execution error: {str(e)}",
                "execution_time": 0
            }
            
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "error": f"System error: {str(e)}",
            "execution_time": 0
        }

def get_file_extension(language: str) -> str:
    """Get file extension for the given language"""
    extensions = {
        "python": ".py",
        "javascript": ".js",
        "java": ".java",
        "cpp": ".cpp",
        "c": ".c"
    }
    return extensions.get(language.lower(), ".py")

@app.post("/execute-code")
def execute_code(request: CodeExecutionRequest):
    """Execute code safely and return results"""
    try:
        # Security checks
        if len(request.code) > 10000:  # 10KB limit
            return {
                "success": False,
                "output": "",
                "error": "Code too long (max 10KB)",
                "execution_time": 0
            }
        
        # Block dangerous operations
        dangerous_patterns = [
            "import os", "import sys", "import subprocess", "import shutil",
            "open(", "file(", "__import__", "eval(", "exec(",
            "os.system", "os.popen", "subprocess.", "shutil.",
            "rm -rf", "del /", "format c:", "mkfs"
        ]
        
        code_lower = request.code.lower()
        for pattern in dangerous_patterns:
            if pattern in code_lower:
                return {
                    "success": False,
                    "output": "",
                    "error": f"Security violation: '{pattern}' not allowed",
                    "execution_time": 0
                }
        
        # Execute the code
        result = execute_code_safely(
            request.code,
            request.language,
            request.input_data,
            request.timeout
        )
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "error": f"Server error: {str(e)}",
            "execution_time": 0
        }

