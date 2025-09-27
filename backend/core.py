import google.generativeai as genai
from langchain_core.prompts import PromptTemplate
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
from dotenv import load_dotenv
from typing import TypedDict
import os
import re
import json
from langgraph.graph import START, END, StateGraph
from langgraph.checkpoint.mongodb import MongoDBSaver
from pymongo import MongoClient

load_dotenv()

MURFAI_API_KEY=os.getenv("MURFAI_API_KEY")
client = MongoClient(os.getenv("MONGO_CLIENT"))

# Configure Gemini API
genai.configure(api_key=os.getenv("GENAI_API_KEY"))
model = genai.GenerativeModel('gemini-2.0-flash')

def gemini_invoke(prompt: str, stream: bool = False):
    """Generate content from Gemini API with optional streaming"""
    try:
        if stream:
            # Use stream_generate_content for streaming
            response = model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        else:
            # Use generate_content for non-streaming
            response = model.generate_content(prompt)
            return response.text.strip()
    except Exception as e:
        print("Gemini API error: ", e)
        if stream:
            yield f"Error: {e}"
        else:
            return f"Error: {e}"

saver = MongoDBSaver(
    client=client,
    db_name="chatbot_langgraph",
    collection_name="chatbot_sessions"
)

# llm = HuggingFaceEndpoint(
#     repo_id="Qwen/Qwen3-Coder-480B-A35B-Instruct",
#     task="text-generation"
# )
# model = ChatHuggingFace(llm=llm)

class Agentstate(TypedDict):
    query: str
    explanation: str
    response: str
    mode: str
    topic: str
    syllabus: list
    current_lesson: int
    user_performance: dict
    adaptive_recommendations: list

def safe_json_parse(text: str):
    """Try to parse JSON out of model output (robust).
       Returns Python obj or None on failure."""
    text = text.strip()
    # try direct JSON
    try:
        return json.loads(text)
    except Exception:
        pass
    # try to find JSON substring
    m = re.search(r'(\{.*\}|\[.*\])', text, flags=re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    return None

def heuristic_is_course(query: str) -> bool:
    q = query.lower()
    triggers = ['teach me', 'full course', 'complete course', 'from scratch', 'syllabus', 'learn .* from basics', 'teach .* step', 'whole course', 'entire course']
    for t in triggers:
        if re.search(t, q):
            return True
    # if user asks "i want to learn dsa" -> course
    if re.search(r'\b(i want to learn|i want to study|i want to learn)\b', q):
        return True
    return False

#---------- PROMPTS ------------
classify_prompt = PromptTemplate(
    template='''
        You are a helper that must classify whether a user query asks for a full course ("course") or a single concept / focused explanation ("concept"). Respond in JSON:

        {{"type": "course" or "concept", "topic": "<short topic name>", "reason": "<one-line reason>"}}

        Only output valid JSON. Query: {query}
    ''',
    input_variables=["query"]
)

syllabus_prompt = PromptTemplate(
    template='''
        Create a comprehensive, focused syllabus (10-15 lessons) for a course titled "{topic}".
        
        ### 🎯 CRITICAL REQUIREMENTS:
        - **ONE TOPIC PER LESSON**: Each lesson must focus on a SINGLE, specific concept or skill
        - **NO TOPIC MERGING**: Never combine multiple topics into one lesson
        - **GRANULAR BREAKDOWN**: Break complex topics into smaller, focused lessons
        - **PROGRESSIVE LEARNING**: Each lesson should build upon previous ones
        - **COMPLETE COVERAGE**: Ensure all aspects of "{topic}" are covered across all lessons
        
        ### 📚 LESSON STRUCTURE GUIDELINES:
        - **Lesson Title**: 3-6 words, specific and focused on ONE concept
        - **Lesson Summary**: 1-2 sentences describing what students will learn in THIS specific lesson
        - **Prerequisites**: Each lesson should clearly build on previous knowledge
        - **Learning Outcomes**: Each lesson should have clear, measurable outcomes
        
        ### 🔍 TOPIC BREAKDOWN STRATEGY:
        For programming/technical topics:
        - Separate basic concepts from advanced implementations
        - Split theory from practical application
        - Separate different data types, algorithms, or techniques
        - Create separate lessons for different use cases or scenarios
        
        For example, instead of "Arrays and Linked Lists" as one lesson, create:
        - "Introduction to Arrays"
        - "Array Operations and Methods"
        - "Introduction to Linked Lists"
        - "Linked List Operations"
        - "Comparing Arrays vs Linked Lists"
        
        ### 📋 OUTPUT FORMAT:
        Return a JSON array of objects: [{"title": "...", "summary": "..."}]
        
        ### ✅ QUALITY CHECKLIST:
        Before finalizing, ensure:
        - Each lesson focuses on ONE specific concept
        - No lesson combines multiple unrelated topics
        - Each lesson has clear, focused learning objectives
        - The progression from lesson to lesson is logical
        - All aspects of "{topic}" are covered across the lessons
        - Each lesson can be taught comprehensively in one session
        
        ----
        
        Now create a detailed syllabus for "{topic}" with 10-15 focused lessons, 
        ensuring each lesson covers exactly ONE topic for maximum learning effectiveness.
    ''',
    input_variables=["topic"]
)

lesson_prompt = PromptTemplate(
    template='''
        You are a world-class expert teacher conducting an intensive, comprehensive classroom session.
        Your mission is to ensure **ZERO DOUBTS REMAIN** - every student must understand every single concept completely.
        This is not just teaching, this is **mastery-level instruction** that leaves no stone unturned.

        Course: {topic}
        Lesson {index_plus1}: "{title}"

        ### 🎯 TEACHING PHILOSOPHY
        - **COMPLETE MASTERY**: Every concept must be explained from multiple angles until crystal clear
        - **NO ASSUMPTIONS**: Never assume prior knowledge - explain everything from the ground up
        - **MULTIPLE LEARNING STYLES**: Visual, auditory, kinesthetic, and logical explanations
        - **ANTICIPATE EVERY DOUBT**: Think of every possible confusion point and address it proactively
        - **REAL-WORLD CONNECTIONS**: Show how this applies in actual jobs, projects, and daily life
        - **PROGRESSIVE COMPLEXITY**: Start simple, build up gradually, never overwhelm

        ### 📚 COMPREHENSIVE LESSON STRUCTURE

        #### 1. **HOOK & MOTIVATION** (Why This Matters)
        - Start with a **compelling real-world scenario** where this knowledge is crucial
        - Share **industry examples** of how this is used in major companies/projects
        - Ask **thought-provoking questions** that make students curious
        - Connect to **previous lessons** and show the learning journey

        #### 2. **LEARNING OBJECTIVES** (What You'll Master)
        - List **5-7 specific, measurable outcomes**
        - Use action verbs: "You will be able to implement, analyze, debug, optimize..."
        - Include both **theoretical understanding** AND **practical skills**
        - Set clear **success criteria** for each objective

        #### 3. **FOUNDATION BUILDING** (Core Concepts)
        - **DEFINITIONS**: Every term explained with multiple examples
        - **HISTORICAL CONTEXT**: Why was this concept created? What problem does it solve?
        - **RELATIONSHIPS**: How does this connect to other concepts?
        - **ANALOGIES**: 3-4 different analogies for the same concept (different learning styles)
        - **VISUAL REPRESENTATIONS**: ASCII diagrams, flowcharts, or step-by-step illustrations

        #### 4. **DEEP DIVE EXPLANATION** (The Heart of Learning)
        - **STEP-BY-STEP BREAKDOWN**: Every single step explained in detail
        - **WHY EACH STEP MATTERS**: Don't just show what, explain why
        - **COMMON MISCONCEPTIONS**: Address typical student errors before they happen
        - **EDGE CASES**: What happens in unusual situations?
        - **PERFORMANCE IMPLICATIONS**: How does this affect speed, memory, etc.?

        #### 5. **EXTENSIVE CODING EXAMPLES** (If Applicable)
        - **MULTIPLE LANGUAGES**: Show examples in Python, JavaScript, Java, C++ (as relevant)
        - **PROGRESSIVE EXAMPLES**: 
          - Basic "Hello World" version
          - Intermediate practical example
          - Advanced real-world implementation
        - **LINE-BY-LINE EXPLANATION**: Every single line of code explained
        - **COMMENTED CODE**: Extensive comments explaining the "why" behind each line
        - **DEBUGGING TIPS**: Common errors and how to fix them
        - **OPTIMIZATION TECHNIQUES**: How to make code faster, cleaner, more maintainable

        #### 6. **INTERACTIVE EXAMPLES** (Hands-On Learning)
        - **WORKED EXAMPLES**: 3-5 complete examples with full solutions
        - **STEP-BY-STEP WALKTHROUGH**: Narrate your thinking process
        - **ALTERNATIVE APPROACHES**: Show different ways to solve the same problem
        - **REAL-WORLD SCENARIOS**: Examples from actual projects/companies

        #### 7. **COMPREHENSIVE PRACTICE** (Active Learning)
        - **CONFIDENCE BUILDERS**: 2-3 very easy problems to build confidence
        - **SKILL BUILDERS**: 3-4 medium problems that apply the concept
        - **CHALLENGE PROBLEMS**: 2-3 advanced problems that push understanding
        - **OPEN-ENDED PROJECTS**: "Build a mini-project using this concept"
        - **DETAILED HINTS**: For each problem, provide step-by-step hints
        - **SOLUTION WALKTHROUGHS**: Complete solutions with explanations

        #### 8. **TROUBLESHOOTING GUIDE** (Common Issues)
        - **FREQUENT ERRORS**: List the 5-10 most common mistakes
        - **DEBUGGING STRATEGIES**: How to identify and fix each error
        - **PERFORMANCE ISSUES**: What to watch out for
        - **BEST PRACTICES**: Industry standards and conventions

        #### 9. **ADVANCED INSIGHTS** (Going Beyond Basics)
        - **INTERNAL WORKINGS**: How does this work under the hood?
        - **OPTIMIZATION TECHNIQUES**: Advanced performance tips
        - **INDUSTRY TRENDS**: How is this evolving? What's new?
        - **RELATED CONCEPTS**: What should students learn next?

        #### 10. **COMPREHENSIVE SUMMARY** (Reinforcement)
        - **KEY TAKEAWAYS**: 8-10 bullet points covering everything
        - **QUICK REFERENCE**: Cheat sheet of important points
        - **COMMON MISTAKES TO AVOID**: Red flags to watch out for
        - **NEXT STEPS**: How this prepares for Lesson {next_index}
        - **FURTHER READING**: Additional resources for deeper learning

        ### 🎨 FORMATTING & ENGAGEMENT
        - **RICH MARKDOWN**: Use headers, code blocks, lists, tables, blockquotes
        - **EMOJIS FOR ENGAGEMENT**: 📚 🔍 💡 ⚡ 🚀 🎯 ✅ ❌ ⚠️ 🔧 📊
        - **CODE BLOCKS**: Proper syntax highlighting for all languages
        - **VISUAL SEPARATORS**: Use horizontal rules, boxes, and spacing
        - **CALL-OUT BOXES**: Important notes, warnings, and tips
        - **PROGRESSIVE DISCLOSURE**: Build complexity gradually

        ### 🔍 QUALITY CHECKLIST
        Before finishing, ensure:
        - ✅ Every concept is explained from multiple angles
        - ✅ Every line of code is commented and explained
        - ✅ Common mistakes are addressed proactively
        - ✅ Real-world applications are clearly shown
        - ✅ Students can implement this without additional help
        - ✅ The lesson connects to previous and future lessons
        - ✅ Multiple learning styles are accommodated
        - ✅ No jargon is used without explanation

        ### 📝 SPECIAL INSTRUCTIONS FOR CODING TOPICS
        If this lesson involves programming concepts:
        - **ALWAYS include working code examples** in multiple languages
        - **EXPLAIN EVERY SINGLE LINE** - no line should be unexplained
        - **SHOW INPUT/OUTPUT** for every example
        - **INCLUDE ERROR HANDLING** and edge cases
        - **PROVIDE COMPLETE, RUNNABLE PROGRAMS** - not just snippets
        - **SHOW DEBUGGING PROCESS** - how to find and fix errors
        - **INCLUDE PERFORMANCE ANALYSIS** - time/space complexity where relevant

        ----

        Now, create the **MOST COMPREHENSIVE, DETAILED LESSON POSSIBLE** for lesson {index_plus1}: "{title}"
        in the course "{topic}". This lesson should be so thorough that a complete beginner can master the topic
        without any additional resources. Leave NO DOUBTS UNANSWERED.
    ''',
    input_variables=["index_plus1", "title", "topic", "next_index"]
)

concept_prompt = PromptTemplate(
    template='''
        You are an expert teacher providing a comprehensive explanation of the concept: "{concept}".
        Your goal is to ensure complete understanding with zero doubts remaining.

        ### 📚 COMPREHENSIVE CONCEPT EXPLANATION STRUCTURE

        #### 1. **CLEAR DEFINITION & CONTEXT**
        - **Precise Definition**: What exactly is this concept?
        - **Real-World Context**: Where and why is this used?
        - **Historical Background**: When/why was this concept created?
        - **Related Concepts**: How does this connect to other ideas?

        #### 2. **DETAILED EXPLANATION**
        - **Step-by-Step Breakdown**: Every aspect explained thoroughly
        - **Multiple Analogies**: 2-3 different analogies for different learning styles
        - **Visual Representations**: ASCII diagrams, flowcharts, or illustrations
        - **Why It Matters**: The importance and impact of understanding this concept

        #### 3. **EXTENSIVE EXAMPLES** (If Applicable)
        - **Multiple Programming Languages**: Python, JavaScript, Java, C++ (as relevant)
        - **Progressive Complexity**: Simple → Intermediate → Advanced examples
        - **Complete Code Examples**: Full, runnable programs with extensive comments
        - **Line-by-Line Explanation**: Every single line of code explained
        - **Input/Output Examples**: Show expected results for each example
        - **Edge Cases**: What happens in unusual situations?

        #### 4. **PRACTICAL APPLICATIONS**
        - **Industry Use Cases**: How major companies use this concept
        - **Real Projects**: Examples from actual software development
        - **Performance Implications**: How this affects speed, memory, scalability
        - **Best Practices**: Industry standards and conventions

        #### 5. **COMMON PITFALLS & TROUBLESHOOTING**
        - **Frequent Mistakes**: Top 5-7 common errors students make
        - **Debugging Strategies**: How to identify and fix each error
        - **Warning Signs**: Red flags to watch out for
        - **Prevention Tips**: How to avoid common pitfalls

        #### 6. **HANDS-ON PRACTICE**
        - **Confidence Builders**: 2-3 easy exercises to build confidence
        - **Skill Applications**: 2-3 medium exercises to apply the concept
        - **Challenge Problems**: 1-2 advanced exercises for deeper understanding
        - **Detailed Solutions**: Complete solutions with step-by-step explanations

        #### 7. **ADVANCED INSIGHTS**
        - **Internal Workings**: How this works under the hood
        - **Optimization Techniques**: Advanced tips for better performance
        - **Alternative Approaches**: Different ways to implement/use this concept
        - **Future Trends**: How this concept is evolving

        #### 8. **QUICK REFERENCE**
        - **Key Points Summary**: 5-7 bullet points covering everything
        - **Syntax/Usage Cheat Sheet**: Quick reference for implementation
        - **Common Patterns**: Typical ways this concept is used
        - **Further Learning**: What to study next

        ### 🎨 FORMATTING REQUIREMENTS
        - Use rich Markdown with headers, code blocks, lists, and tables
        - Include emojis for engagement: 📚 🔍 💡 ⚡ 🚀 🎯 ✅ ❌ ⚠️ 🔧 📊
        - Use proper syntax highlighting for all code examples
        - Include visual separators and call-out boxes for important information
        - Make it scannable with clear sections and bullet points

        ### 🔍 QUALITY CHECKLIST
        Ensure your explanation includes:
        - ✅ Complete definition with context
        - ✅ Multiple examples in different programming languages (if applicable)
        - ✅ Every line of code explained (if code is involved)
        - ✅ Common mistakes addressed proactively
        - ✅ Real-world applications clearly shown
        - ✅ Practical exercises with solutions
        - ✅ No jargon without explanation
        - ✅ Progressive complexity building

        ----

        Now provide a **COMPREHENSIVE, DETAILED EXPLANATION** of the concept "{concept}".
        This should be so thorough that a complete beginner can understand and implement
        this concept without any additional resources. Leave NO DOUBTS UNANSWERED.
    ''',
    input_variables=["concept"]
)

def handle_query(state: Agentstate) -> Agentstate:
    query = state.get('query', '').strip()
    if not query:
        state['response'] = "Please type a question or 'teach me <topic>"
        return state
    
    if state.get('mode') == 'course' and 'syllabus' in state:
        cmd = query.lower().strip()
        if cmd in ["next", "n", "continue", "resume"]:
            state["current_lesson"] = min(state.get("current_lesson", 0) + 1, len(state['syllabus']) - 1)
            state['response'] = render_lesson(state, state['current_lesson'])
            return state
        if cmd in ['prev', "previous", "back"]:
            state['current_lesson'] = max(state.get("current_lesson", 0) - 1, 0)
            state['response'] = render_lesson(state, state.get('current_lesson', 0))
            return state
        if cmd in ('repeat', 'again'):
            state['response'] = render_lesson(state, state.get('current_lesson', 0))
            return state
        if cmd.startswith('goto '):
            parts = cmd.split()
            try:
                n = int(parts[1])
                n_idx = max(0, min(n-1, len(state['syllabus'])-1))
                state['current_lesson'] = n_idx
                state['response'] = render_lesson(state, n_idx)
                return state
            except Exception:
                state['response'] = "Could not parse the lesson number. Use 'goto 3' to go to lesson 3."
                return state
        if cmd in ('stop', 'end', 'quit', 'exit'):
            state['mode'] = 'paused'
            state['response'] = "Course paused. Type 'resume' to continue or 'teach me <topic>' to start another course."
            return state
        
        classification = classify_query(query)
        if classification['type'] == 'course':
            topic = classification.get('topic') or query
            state['mode'] = 'course'
            state['topic'] = topic
            syllabus = generate_syllabus(topic)
            state['syllabus'] = syllabus
            state['current_lesson'] = 0
            syllabus_text = "Syllabus:\n" + "\n".join([f"{i+1}. {s['title']} - {s['summary']}" for i, s in enumerate(syllabus)])
            lesson_text = render_lesson(state, 0)
            state['response'] = f"Starting course: {topic}\n\n{syllabus_text}\n\n---\n{lesson_text}\n\nControls: 'next', 'prev', 'repeat', 'goto <n>', 'stop', or ask a concept question."
            return state

        if classification['type'] == 'concept':
            explanation = generate_concept_explanation(query)
            state['response'] = f"{explanation}/n/n (you are in course '{state.get('topic')}'. Type 'resume' or 'next' to continue the course)"
            return state
        
        explanation = generate_concept_explanation(query)
        state['response'] = explanation
        return state
    
    classification = classify_query(query)
    if classification['type'] == 'course':
        topic = classification.get('topic') or query
        state['mode'] = 'course'
        state['topic'] = topic
        syllabus = generate_syllabus(topic)
        state['syllabus'] = syllabus
        state['current_lesson'] = 0
        # render syllabus summary + lesson 1
        syllabus_text = "Syllabus:\n" + "\n".join([f"{i+1}. {s['title']} - {s['summary']}" for i, s in enumerate(syllabus)])
        lesson_text = render_lesson(state, 0)
        state['response'] = f"Starting course: {topic}\n\n{syllabus_text}\n\n---\n{lesson_text}\n\nControls: 'next', 'prev', 'repeat', 'goto <n>', 'stop', or ask a concept question."
        return state
    else:
        # concept -> give focused explanation
        explanation = generate_concept_explanation(query)
        state['mode'] = 'concept'
        state['response'] = explanation
        return state

def classify_query(query: str):
    try:
        prompt = classify_prompt.format(query=query)
        # res = model.invoke(prompt)
        res = gemini_invoke(prompt)
        # parsed = safe_json_parse(res.content)
        parsed = safe_json_parse(res)
        if parsed and 'type' in parsed:
            parsed['type'] = parsed['type'].lower()
            if parsed['type'] not in ('course', 'concept'):
                parsed['type'] = 'concept'
            parsed.setdefault('topic', query)
            return parsed
    except Exception:
        pass

    if heuristic_is_course(query):
        return {'type': 'course', 'topic': query, 'reason': 'heuristic match'}
    else:
        return {'type': 'concept', 'topic': query, 'reason': 'heuristic fallback'}
    
def generate_syllabus(topic: str):
    try:
        prompt = syllabus_prompt.format(topic=topic)
        # res = model.invoke(prompt)
        res = gemini_invoke(prompt)
        # parsed = safe_json_parse(res.content)
        parsed = safe_json_parse(res)
        if isinstance(parsed, list):
            syllabus = []
            for item in parsed:
                if isinstance(item, dict):
                    syllabus.append({"title": item.get('title', 'Untitled'), 'summary': item.get('summary', '')})
                else:
                    text = str(item)
                    parts = text.split('-', 1)
                    title = parts[0].strip()
                    summary = parts[1].strip() if len(parts) > 1 else ''
                    syllabus.append({'title': title, 'summary': summary})
            if syllabus:
                return syllabus
    except Exception:
        pass

    try:
        fallback_prompt = f'''
        Create 12-15 focused lesson titles for a course on '{topic}'. 
        Each lesson should cover ONE specific concept only. 
        Break down the topic into granular, focused lessons.
        Return one lesson title per line, no numbering.
        '''
        # res = model.invoke(fallback_prompt)
        res = gemini_invoke(fallback_prompt)
        # lines = [l.strip() for l in res.content.splitlines() if l.strip()]
        lines = [l.strip() for l in res.splitlines() if l.strip()]
        # Remove numbering and clean up titles
        clean_lines = [re.sub(r'^\d+\.\s*', '', l) for l in lines if l.strip()]
        syllabus = [{'title': line, 'summary': f'Learn {line.lower()}'} for line in clean_lines[:15]]
        if syllabus:
            return syllabus
    except Exception:
        pass

    # Enhanced fallback with single-topic focus
    return [
        {'title': f'Introduction to {topic}', 'summary': 'Overview and fundamental concepts'},
        {'title': f'Basic {topic} Concepts', 'summary': 'Core principles and terminology'},
        {'title': f'{topic} Fundamentals', 'summary': 'Essential building blocks'},
        {'title': f'Working with {topic}', 'summary': 'Practical implementation basics'},
        {'title': f'{topic} Best Practices', 'summary': 'Industry standards and conventions'},
        {'title': f'Advanced {topic} Techniques', 'summary': 'Complex implementations and optimizations'},
        {'title': f'{topic} Real-world Applications', 'summary': 'Practical use cases and examples'},
        {'title': f'Troubleshooting {topic}', 'summary': 'Common issues and debugging strategies'},
        {'title': f'{topic} Performance Optimization', 'summary': 'Speed and efficiency improvements'},
        {'title': f'Mastering {topic}', 'summary': 'Advanced mastery and expert techniques'}
    ]

def generate_lesson_text(topic: str, index: int, title: str):
    try:
        prompt = lesson_prompt.format(
            topic=topic,
            index_plus1=index+1,
            next_index=index+2,
            title=title
        )
        # res = model.invoke(prompt)
        res = gemini_invoke(prompt)
        # return res.content.strip()
        return res
    except Exception as e:
        return f"Sorry, couldn't generate lesson due to: {e}"

def generate_lesson_text_stream(topic: str, index: int, title: str):
    """Generate lesson content with streaming"""
    try:
        prompt = lesson_prompt.format(
            topic=topic,
            index_plus1=index+1,
            next_index=index+2,
            title=title
        )
        for chunk in gemini_invoke(prompt, stream=True):
            yield chunk
    except Exception as e:
        yield f"Sorry, couldn't generate lesson due to: {e}"
    
def generate_concept_explanation(concept: str):
    try:
        prompt = concept_prompt.format(concept=concept)
        # res = model.invoke(prompt)
        res = gemini_invoke(prompt)
        # return res.content.strip()
        return res
    except Exception as e:
        # fallback short explanation
        return f"Sorry, couldn't generate explanation due to: {e}"

def get_user_performance(user_id: str, topic: str = None) -> dict:
    """Get user's performance data from MongoDB"""
    try:
        from pymongo import MongoClient
        import os
        from dotenv import load_dotenv
        
        load_dotenv()
        client = MongoClient(os.getenv("MONGO_CLIENT"))
        db = client["learning_platform"]
        
        # Get quiz attempts
        filter_query = {"user_id": user_id}
        if topic:
            filter_query["topic"] = topic
            
        attempts = list(db.quiz_attempts.find(filter_query).sort("submitted_at", -1))
        
        if not attempts:
            return {"average_score": 0, "total_attempts": 0, "weak_areas": [], "strong_areas": []}
        
        # Calculate performance metrics
        scores = [attempt["score"] for attempt in attempts]
        average_score = sum(scores) / len(scores)
        
        # Get topic-wise performance
        topic_scores = {}
        for attempt in attempts:
            topic_name = attempt["topic"]
            if topic_name not in topic_scores:
                topic_scores[topic_name] = []
            topic_scores[topic_name].append(attempt["score"])
        
        # Calculate average scores per topic
        for topic_name in topic_scores:
            topic_scores[topic_name] = sum(topic_scores[topic_name]) / len(topic_scores[topic_name])
        
        # Identify weak and strong areas
        weak_areas = [topic for topic, score in topic_scores.items() if score < 60]
        strong_areas = [topic for topic, score in topic_scores.items() if score >= 80]
        
        return {
            "average_score": average_score,
            "total_attempts": len(attempts),
            "weak_areas": weak_areas,
            "strong_areas": strong_areas,
            "topic_scores": topic_scores,
            "recent_scores": scores[:5]  # Last 5 scores
        }
    except Exception as e:
        print(f"Error getting user performance: {e}")
        return {"average_score": 0, "total_attempts": 0, "weak_areas": [], "strong_areas": []}

def generate_adaptive_recommendations(performance: dict, current_topic: str) -> list:
    """Generate adaptive learning recommendations based on performance"""
    recommendations = []
    
    # Check if performance data exists and has required keys
    if not performance or not isinstance(performance, dict):
        return recommendations
    
    average_score = performance.get("average_score", 0)
    weak_areas = performance.get("weak_areas", [])
    recent_scores = performance.get("recent_scores", [])
    
    if average_score < 50:
        recommendations.append({
            "type": "review",
            "message": "Consider reviewing previous lessons before moving forward",
            "action": "suggest_review"
        })
    elif average_score >= 80:
        recommendations.append({
            "type": "fast_track",
            "message": "Great progress! You're ready for advanced topics",
            "action": "suggest_advanced"
        })
    
    if current_topic in weak_areas:
        recommendations.append({
            "type": "focus",
            "message": f"Focus on strengthening your understanding of {current_topic}",
            "action": "suggest_practice"
        })
    
    if recent_scores and len(recent_scores) >= 3:
        recent_avg = sum(recent_scores[:3]) / 3
        if recent_avg < 60:
            recommendations.append({
                "type": "trend",
                "message": "Your recent performance shows a declining trend. Consider taking a break and reviewing fundamentals",
                "action": "suggest_break"
            })
    
    return recommendations

def adapt_syllabus_based_on_performance(syllabus: list, performance: dict, current_topic: str) -> list:
    """Adapt syllabus based on user performance"""
    try:
        if not performance or not isinstance(performance, dict) or performance.get("total_attempts", 0) == 0:
            return syllabus
        
        weak_areas = performance.get("weak_areas", [])
        strong_areas = performance.get("strong_areas", [])
        average_score = performance.get("average_score", 0)
        
        # If user is struggling with current topic, add more practice lessons
        if current_topic in weak_areas:
            # Add practice-focused lessons
            practice_lessons = [
                {"title": f"{current_topic} Practice Session", "summary": "Hands-on practice with guided examples"},
                {"title": f"{current_topic} Common Mistakes", "summary": "Learn about common pitfalls and how to avoid them"},
                {"title": f"{current_topic} Review & Reinforcement", "summary": "Comprehensive review of key concepts"}
            ]
            
            # Insert practice lessons after current lesson
            adapted_syllabus = syllabus.copy()
            current_index = 0  # Assuming we're at the beginning
            for i, lesson in enumerate(adapted_syllabus):
                if current_topic.lower() in lesson["title"].lower():
                    current_index = i
                    break
            
            # Insert practice lessons
            for j, practice_lesson in enumerate(practice_lessons):
                adapted_syllabus.insert(current_index + 1 + j, practice_lesson)
            
            return adapted_syllabus
        
        # If user is excelling, suggest advanced topics
        elif current_topic in strong_areas and average_score >= 80:
            advanced_lessons = [
                {"title": f"Advanced {current_topic} Techniques", "summary": "Explore advanced concepts and optimization techniques"},
                {"title": f"{current_topic} Real-world Applications", "summary": "See how this is used in industry and complex projects"},
                {"title": f"{current_topic} Best Practices & Patterns", "summary": "Learn industry-standard approaches and design patterns"}
            ]
            
            adapted_syllabus = syllabus.copy()
            # Add advanced lessons at the end
            adapted_syllabus.extend(advanced_lessons)
            return adapted_syllabus
        
        return syllabus
        
    except Exception as e:
        print(f"Error adapting syllabus: {e}")
        return syllabus

def render_lesson(state: Agentstate, lesson_idx: int) -> str:
    syllabus = state.get('syllabus', [])
    if not syllabus or lesson_idx < 0 or lesson_idx >= len(syllabus):
        return "Lesson not found."
    lesson_meta = syllabus[lesson_idx]
    topic = state.get('topic', 'the course')
    title = lesson_meta.get('title')
    
    try:
        # Get user performance for adaptive learning
        user_performance = get_user_performance("default_user", topic)
        state['user_performance'] = user_performance
        
        # Generate adaptive recommendations
        recommendations = generate_adaptive_recommendations(user_performance, topic)
        state['adaptive_recommendations'] = recommendations
        
        # Adapt syllabus if needed
        adapted_syllabus = adapt_syllabus_based_on_performance(syllabus, user_performance, topic)
        if adapted_syllabus != syllabus:
            state['syllabus'] = adapted_syllabus
            syllabus = adapted_syllabus
        
    except Exception as e:
        print(f"Error in adaptive learning: {e}")
        # Continue with normal lesson generation if adaptive features fail
        user_performance = {"average_score": 0, "total_attempts": 0, "weak_areas": [], "strong_areas": []}
        recommendations = []
    
    # try to reuse cached lesson content if you stored one (optional)
    # For simplicity we generate fresh content each time (you can cache into state if desired)
    lesson_text = generate_lesson_text(topic, lesson_idx, title)
    
    # Add adaptive recommendations to lesson header
    header = f"Lesson {lesson_idx+1}: {title}\n(Topic: {topic})\n\n"
    
    # Add performance-based recommendations
    if recommendations:
        header += "🎯 **Personalized Learning Recommendations:**\n"
        for rec in recommendations:
            header += f"• {rec['message']}\n"
        header += "\n"
    
    return header + lesson_text

graph = StateGraph(Agentstate)
graph.add_node("handle_query", handle_query)
graph.add_edge(START, "handle_query")
graph.add_edge("handle_query", END)

workflow = graph.compile(checkpointer=saver)

# thread_id = '1'
# print("chat started. Type 'exit' to stop.\nCommands while in a course: next, prev, repeat, goto <n>, stop\n")

# while True:
#     user_input = input("You: ").strip()
#     if user_input.lower() in ["quit", "exit", "bye"]:
#         print("AI: CHAT ENDED")
#         break

#     config = {"configurable": {"thread_id": thread_id}}
#     state = {"query": user_input}

#     try:
#         result = workflow.invoke(state, config=config)
#         # handler sets state['response'] to final text
#         print("AI:", result.get('response', result.get('explanation', '')) )
#     except Exception as e:
#         print("[ERROR]", e)