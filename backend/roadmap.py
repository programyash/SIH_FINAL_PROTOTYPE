from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
from langgraph.graph import StateGraph, START, END
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv
import os
import json
import re
from typing import TypedDict
from langgraph.checkpoint.mongodb import MongoDBSaver
from pymongo import MongoClient
import google.generativeai as genai

load_dotenv()

client = MongoClient(os.getenv("MONGO_CLIENT"))

saver = MongoDBSaver.from_conn_string(
    os.getenv("MONGO_CLIENT"),
    db_name="chatbot_langgraph",
    collection_name="chatbot_sessions"
)

genai.configure(api_key=os.getenv("GENAI_API_KEY"))
model = genai.GenerativeModel('gemini-2.0-flash')

def ask_gemini(prompt: str):
    response = model.generate_content(prompt)
    return response.text.strip()

# llm = HuggingFaceEndpoint(
#     repo_id="Qwen/Qwen3-Coder-480B-A35B-Instruct",
#     task="text-generation"
# )
# model = ChatHuggingFace(llm=llm)

class agentstate(TypedDict):
    skill: str
    roadmap: dict

prompt = PromptTemplate(
    template='''
        You are an expert mentor. Create a structured **learning roadmap** for {skill}.  
        Format the response as valid JSON only, following this structure:

        {{
          "beginner": [
            {{"title": "Topic 1", "description": "short explanation", "resources": ["link1", "link2"]}},
            {{"title": "Topic 2", "description": "short explanation", "resources": ["link1"]}}
          ],
          "intermediate": [
            {{"title": "Topic 1", "description": "short explanation", "resources": ["link1"]}}
          ],
          "advanced": [
            {{"title": "Topic 1", "description": "short explanation", "resources": ["link1"]}}
          ]
        }}

        Rules:
        - Output valid JSON only (no extra text, no markdown).
        - Keep 3–5 topics per stage.
        - Each topic must include "title", "description", and "resources".
    ''',
    input_variables=['skill']
)

def safe_json_parse(text: str):
    """Try to parse JSON out of model output (robust).
       Returns Python obj or None on failure."""
    text = text.strip()
    # try direct JSON
    try:
        return json.loads(text)
    except Exception:
        pass
    m = re.search(r'(\{.*\}|\[.*\])', text, flags=re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    return None

def generate_roadmap(state: agentstate) -> agentstate:
    prompt_text = prompt.format(skill=state['skill'])
    response = model.generate_content(prompt_text)
    try:
        roadmap_json = safe_json_parse(response.text.strip())
    except:
        roadmap_json = {"error": "Failed to parse roadmap."}
    state['roadmap'] = roadmap_json
    return state

graph = StateGraph(agentstate)

graph.add_node("generate_roadmap", generate_roadmap)
graph.add_edge(START, "generate_roadmap")
graph.add_edge("generate_roadmap", END)

roadmap_workflow = graph.compile(checkpointer=saver)