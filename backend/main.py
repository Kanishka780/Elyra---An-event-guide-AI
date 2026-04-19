from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from pydantic import BaseModel
import csv
import io
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import datetime
import google.generativeai as genai
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
            return json.load(f)
    return {"events": [], "zones": [], "facilities": []}

BASE_EVENT_DATA = load_data()
CURRENT_ADMIN_PIN = os.environ.get("ADMIN_PIN", "1234")

class AdminVerifyRequest(BaseModel):
    pin: str

class ChatRequest(BaseModel):
    query: str
    user_zone: str = "Entrance Gate"

def get_dynamic_status(sim_time_str: str = None):
    # Deep copy base data
    data = json.loads(json.dumps(BASE_EVENT_DATA))
    # ... (Simplified for speed, we keep the data the same for now)
    return data

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

@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    global BASE_EVENT_DATA
    contents = await file.read()
    # Process CSV...
    BASE_EVENT_DATA = {"events": [], "zones": [], "facilities": []} # placeholder for logic
    return {"success": True}

@app.post("/api/chat")
async def chat_with_assistant(request: ChatRequest):
    # Current simulated time logic
    simulated_time = datetime.datetime.now().isoformat()
    
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"reply": "Configuration Error: No AI API key found.", "suggested_actions": []}

    try:
        genai.configure(api_key=api_key)
        # Using the absolute most universal model name
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = f"""
        Answer as Elyra, an AI Event Assistant.
        CONETXT: {json.dumps(BASE_EVENT_DATA)}
        USER QUERY: {request.query}
        
        Respond ONLY with a valid JSON object:
        {{"reply": "your message", "suggested_actions": ["question 1", "question 2"]}}
        """
        
        response = model.generate_content(prompt)
        text = response.text
        
        try:
            # Clean and parse JSON
            clean_text = text.replace('```json', '').replace('```', '').strip()
            return json.loads(clean_text)
        except:
            # Fallback if AI skips JSON format
            return {
                "reply": text,
                "suggested_actions": ["Ask something else", "Show map"]
            }
        
    except Exception as e:
        return {
            "reply": f"[SYNC-FIX-V4] Connection Error: {str(e)}. Please wait 30 seconds and try again.",
            "suggested_actions": ["Try again", "Show map"]
        }

# Static file serving (Production)
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
