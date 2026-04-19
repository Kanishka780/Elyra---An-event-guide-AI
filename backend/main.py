from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from pydantic import BaseModel
import csv
import io
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import datetime
# 🚀 Migration to the NEW Google GenAI SDK
from google import genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Elyra Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATA_FILE = os.path.join(os.path.dirname(__file__), "event_data.json")

# Load base data
def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            try:
                return json.load(f)
            except:
                pass
    return {"events": [], "zones": [], "facilities": []}

BASE_EVENT_DATA = load_data()
CURRENT_ADMIN_PIN = os.environ.get("ADMIN_PIN", "1234")

class AdminVerifyRequest(BaseModel):
    pin: str

class ChatRequest(BaseModel):
    query: str
    user_zone: str = "Entrance Gate"

@app.post("/api/set-admin-pin")
def set_admin_pin(request: AdminVerifyRequest):
    global CURRENT_ADMIN_PIN
    CURRENT_ADMIN_PIN = request.pin
    return {"success": True, "message": "PIN updated successfully"}

@app.post("/api/verify-admin")
def verify_admin(request: AdminVerifyRequest):
    if request.pin == CURRENT_ADMIN_PIN:
        return {"success": True, "message": "Access Granted"}
    raise HTTPException(status_code=401, detail="Invalid PIN")

@app.get("/api/event_status")
def get_event_status():
    return BASE_EVENT_DATA

@app.post("/api/chat")
async def chat_with_assistant(request: ChatRequest):
    simulated_time = datetime.datetime.now().isoformat()
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        return {"reply": "Configuration Error: No AI API key found.", "suggested_actions": []}

    try:
        # Initialize the NEW GenAI Client
        client = genai.Client(api_key=api_key)
        
        system_prompt = f"""
        You are Elyra, a premium AI Event Assistant. 
        CONTEXT: {json.dumps(BASE_EVENT_DATA)}
        CURRENT_TIME: {simulated_time}
        USER_ZONE: {request.user_zone}
        
        LOGIC:
        1. Answer based on the CONTEXT. Be helpful and expert.
        2. Always suggest 2 follow-up questions.
        3. Respond strictly in JSON format:
        {{"reply": "your text", "suggested_actions": ["question 1", "question 2"]}}
        """
        
        # Using the STABLE Gemini 1.5 Flash engine with the NEW SDK
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=f"{system_prompt}\n\nUSER QUERY: {request.query}"
        )
        
        text = response.text
        
        try:
             # Cleanup and Parse
             clean_text = text.replace('```json', '').replace('```', '').strip()
             return json.loads(clean_text)
        except:
             return {"reply": text, "suggested_actions": ["What else?", "Show map"]}
            
    except Exception as e:
        return {
            "reply": f"AI Engine Connection issue: {str(e)}. Please retry in a few moments.",
            "suggested_actions": ["Try again", "Show map"]
        }

# Static serving
import os as os_mod
STATIC_DIR = os_mod.path.join(os_mod.path.dirname(__file__), "static")
if os_mod.path.exists(STATIC_DIR):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    app.mount("/assets", StaticFiles(directory=os_mod.path.join(STATIC_DIR, "assets")), name="assets")
    @app.get("/", include_in_schema=False)
    def serve_root(): return FileResponse(os_mod.path.join(STATIC_DIR, "index.html"))
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str): return FileResponse(os_mod.path.join(STATIC_DIR, "index.html"))
