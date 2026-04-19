from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from pydantic import BaseModel
import csv
import io
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import datetime
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
        # 🚀 2026 GEMINI 2.5 MIGRATION (Modern Unified SDK)
        # We are now using the 'google-genai' library which is the 2026 production standard.
        client = genai.Client(api_key=api_key)
        
        # 'gemini-2.5-flash' is the stable current flagship as of April 2026.
        # This replaces the retired 1.5 and 1.0 models.
        model_id = "gemini-2.5-flash"
        
        system_prompt = f"""
        You are Elyra, a premium AI Event Assistant.
        CONTEXT: {json.dumps(BASE_EVENT_DATA)}
        CURRENT_TIME: {simulated_time}
        USER_ZONE: {request.user_zone}
        
        LOGIC:
        1. Answer strictly based on the provided CONTEXT. 
        2. Be expert and professional.
        3. Respond strictly in JSON:
        {{"reply": "text response", "suggested_actions": ["question 1", "question 2"]}}
        """
        
        # New unified SDK method
        response = client.models.generate_content(
            model=model_id,
            contents=f"{system_prompt}\n\nUSER QUERY: {request.query}"
        )
        
        try:
             raw_text = response.text
             # Cleanup markdown if present
             clean_text = raw_text.replace('```json', '').replace('```', '').strip()
             return json.loads(clean_text)
        except Exception as parse_err:
             # Fallback to plain text if JSON parsing fails
             return {"reply": response.text, "suggested_actions": ["Ask about events", "Show map"]}
            
    except Exception as e:
        # Standard production error response with refined diagnostics
        return {
            "reply": f"Elyra Service Notice: The AI engine (2.5 Stable) reported a connection issue ({str(e)}). Please refresh and try again.",
            "suggested_actions": ["Refresh", "Show map"]
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
    @get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str): return FileResponse(os_mod.path.join(STATIC_DIR, "index.html"))
