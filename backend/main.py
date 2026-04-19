from fastapi import FastAPI, Request, UploadFile, File, HTTPException
import csv
import io
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json
import os
import datetime
from google import genai
from google.genai import types
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

# (Static serving logic moved to the bottom of the file for correctness)

# Load context data
DATA_FILE = os.path.join(os.path.dirname(__file__), "event_data.json")
try:
    with open(DATA_FILE, "r") as f:
        BASE_EVENT_DATA = json.load(f)
except Exception as e:
    BASE_EVENT_DATA = {"events": [], "facilities": [], "zones": []}
    print(f"Error loading event data: {e}")

def get_dynamic_status(sim_time_str: str = None):
    """Generates dynamic announcements and status updates based on the current time."""
    # Deep copy base data
    data = json.loads(json.dumps(BASE_EVENT_DATA))
    
    # Target time
    if sim_time_str:
        try:
            now = datetime.datetime.fromisoformat(sim_time_str)
        except:
            now = datetime.datetime.now()
    else:
        now = datetime.datetime.now()

    # Clear static alerts - we will generate them
    data["announcements"] = []
    data["live_status"]["crowd_alerts"] = []
    
    # Process Events for Announcements
    for event in data["events"]:
        try:
            start = datetime.datetime.fromisoformat(event["startTime"].replace('Z', '+00:00'))
            end = datetime.datetime.fromisoformat(event["endTime"].replace('Z', '+00:00'))
            
            # Remove TZ info for comparison if needed (assuming local system time for sim)
            # Standardizing to naive for comparison if data is mixed
            if start.tzinfo:
                now_aware = datetime.datetime.now(start.tzinfo)
            else:
                now_aware = now

            diff_to_start = (start - now_aware).total_seconds() / 60
            is_ongoing = start <= now_aware <= end
            diff_from_end = (now_aware - end).total_seconds() / 60

            # 1. Upcoming Alerts
            if 0 < diff_to_start <= 15:
                data["announcements"].append({
                    "message": f"🔥 {event['name']} starting in {int(diff_to_start)} minutes at {event['location']}!",
                    "priority": "high",
                    "type": "ANN_STARTING"
                })
            elif 15 < diff_to_start <= 45:
                 data["announcements"].append({
                    "message": f"Upcoming: {event['name']} @ {event['location']} ({start.strftime('%H:%M')})",
                    "priority": "medium",
                    "type": "ANN_UPCOMING"
                })

            # 2. Ongoing Alerts
            if is_ongoing:
                data["announcements"].append({
                    "message": f"✨ {event['name']} is LIVE now at {event['location']}.",
                    "priority": "medium",
                    "type": "ANN_LIVE"
                })
                # Scenario Engine: Set high crowd in the event zone
                data["live_status"]["crowd_alerts"].append({
                    "zone": event["zone"],
                    "level": "high",
                    "message": f"Heavy crowd expected near {event['location']} for {event['name']}"
                })

            # 3. Post-Event Announcements
            if 0 < diff_from_end <= 10:
                data["announcements"].append({
                    "message": f"Hope you enjoyed {event['name']}! Head to the exit or food stalls next.",
                    "priority": "low",
                    "type": "ANN_ENDED"
                })

        except Exception as e:
            print(f"Time processing error for event {event.get('name')}: {e}")

    # 4. Emergency Escalation Logic
    # (Example: If more than 2 high crowd zones, trigger a general safety announcement)
    high_crowd_zones = [a for a in data["live_status"]["crowd_alerts"] if a["level"] == "high"]
    if len(high_crowd_zones) >= 2:
        data["announcements"].insert(0, {
            "message": "⚠️ Notice: High traffic detected across multiple zones. Please stay hydrated.",
            "priority": "high",
            "type": "SAFETY_NOTICE"
        })

    # Add fallback if no announcements
    if not data["announcements"]:
        data["announcements"].append({
            "message": "Welcome to Event Horizon! Enjoy the show.",
            "priority": "low",
            "type": "WELCOME"
        })

    return data

class ChatRequest(BaseModel):
    query: str
    user_zone: str = "Entrance Gate"
    current_time: str = "" # ISO Format string

class AdminVerifyRequest(BaseModel):
    pin: str

# Global store for the current session's pin (defaults to 1234)
CURRENT_ADMIN_PIN = os.environ.get("ADMIN_PIN", "1234")

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
    return get_dynamic_status()

@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    try:
        content = await file.read()
        stream = io.StringIO(content.decode('utf-8'))
        reader = csv.DictReader(stream)
        
        new_events = []
        # Required columns mapping (case-insensitive)
        for row in reader:
            # Normalize keys to lowercase for easier lookup
            normalized_row = {k.lower().strip(): v for k, v in row.items()}
            
            # Extract fields with fallbacks for common naming variations
            event_name = normalized_row.get('name') or normalized_row.get('title') or normalized_row.get('event')
            start_time = normalized_row.get('starttime') or normalized_row.get('start') or normalized_row.get('time')
            end_time = normalized_row.get('endtime') or normalized_row.get('end')
            location = normalized_row.get('location') or normalized_row.get('venue') or normalized_row.get('place')
            zone = normalized_row.get('zone') or normalized_row.get('area')
            description = normalized_row.get('description') or normalized_row.get('details') or ""

            if not all([event_name, start_time, location, zone]):
                continue # Skip invalid rows
            
            # Simple heuristic for time format (if only HH:MM is provided, assume today)
            if len(start_time) <= 5 and ":" in start_time:
                 today = datetime.datetime.now().strftime("%Y-%m-%d")
                 start_iso = f"{today}T{start_time}:00+05:30"
            else:
                 start_iso = start_time

            if end_time and len(end_time) <= 5 and ":" in end_time:
                 today = datetime.datetime.now().strftime("%Y-%m-%d")
                 end_iso = f"{today}T{end_time}:00+05:30"
            else:
                 end_iso = end_time or start_iso # Fallback end time to start time if missing

            new_events.append({
                "id": f"uploaded_{len(new_events)+1}",
                "name": event_name,
                "location": location,
                "zone": zone,
                "startTime": start_iso,
                "endTime": end_iso,
                "description": description
            })
        
        if not new_events:
            raise HTTPException(status_code=400, detail="No valid events found in CSV. Please ensure columns like 'name', 'startTime', 'location', and 'zone' exist.")
        
        # Globally update the base data for this session
        global BASE_EVENT_DATA
        BASE_EVENT_DATA["events"] = new_events
        print(f"Successfully uploaded {len(new_events)} events.")
        
        return {"message": f"Successfully uploaded {len(new_events)} events.", "events_count": len(new_events)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")

@app.post("/api/reset-data")
def reset_data():
    global BASE_EVENT_DATA
    try:
        with open(DATA_FILE, "r") as f:
            BASE_EVENT_DATA = json.load(f)
        return {"message": "Data reset to original demo state."}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to reload base data.")

@app.post("/api/chat")
def chat_with_assistant(request: ChatRequest):
    # Determine the time context
    if request.current_time:
        simulated_time = request.current_time
    else:
        simulated_time = datetime.datetime.now().isoformat()
    
    # Init Gemini client. It expects GEMINI_API_KEY in environment
    try:
        # Initializing without explicit api_key tries to get it from env.
        # Fallback provided if not set for some reason, though it will error on api call.
        client = genai.Client()
    except Exception as e:
        return {"reply": f"System error initializing AI: {str(e)}", "suggested_actions": []}

    # Get Dynamic Data for this specific time
    dynamic_data = get_dynamic_status(simulated_time)

    # Construct the system instruction containing our context
    system_instruction = f"""
    You are an intelligent, real-time AI Event Assistant for a physical event.
    
    CURRENT CONTEXT:
    - Current Time: {simulated_time}
    - User's Current Location (Zone): {request.user_zone}
    
    EVENT KNOWLEDGE BASE (LIVE STATUS):
    {json.dumps(dynamic_data, indent=2)}
    
    YOUR GOALS & INTELLIGENCE LOGIC:
    1. Answer the user's query intelligently based on the provided Event Knowledge Base.
    2. Be concise, helpful, and conversational.
    3. REAL-TIME EVENT AWARENESS: Compare "Current Time" against `startTime` and `endTime` using standard chronological math. If Current Time < startTime, it is UPCOMING. If startTime <= Current Time <= endTime, it is ONGOING. If Current Time > endTime, it is COMPLETED. Do not hallucinate status.
    4. SMART FACILITY & FOOD RECOMMENDATION: Scan `crowd_level` and `wait_time` in `facilities` and `food_stalls`. EXPLICITLY recommend the fastest/least crowded option. State the wait times.
    5. ENTRY MANAGEMENT: If asked about gates, look at `entry_status.gates` and recommend the one with the shortest `wait_time`.
    6. SAFETY PROTOCOL: If the user indicates an emergency, check `emergency.active_cases` and direct them to `emergency.help_centers`.
    7. ROUTING: Use `distances` and `connected_to` logic to formulate directions between zones. If the user explicitly asks for 'directions' or 'navigate' or 'how to get to', you MUST ALSO return `"action": "show_map"` along with a `"path"` array in your JSON response representing the step-by-step route.
    8. GENERAL QUESTIONS: Use the `general_faq` object to answer questions about tickets, parking, emergencies, etc. If the user asks a general event question NOT explicitly in the FAQ, DO NOT reject the question. Invent a polite, plausible, realistic answer that fits a large music/tech festival.
    
    FORMAT RESPONSE IN JSON:
    Return your response strictly as a JSON object with these keys:
    - "reply": Your intelligent conversational answer.
    - "suggested_actions": A list of 2 or 3 short follow-up questions the user can ask.
    - "action": (Optional) Set strictly to "show_map" if providing directions.
    - "path": (Optional) A list of string zone names representing the exact step-by-step route (e.g., ["Entrance Gate", "Zone A", "Zone B"]) if action is "show_map".
    """

    try:
         # Use the structured output capability
        response = client.models.generate_content(
            model='gemini-flash-latest',
            contents=request.query,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
            ),
        )
        # Parse the JSON string from the model
        result_json = json.loads(response.text)
        return result_json
        
    except Exception as e:
        print(f"Inference error: {e}")
        return {
            "reply": "I'm sorry, I'm having trouble connecting to my central brain right now. Please try again later.",
            "suggested_actions": ["Try again", "Show map"]
        }

# Mount static files for production deployment (Docker)
import os as os_mod
# ═══════════════════════════ PRODUCTION STATIC SERVING ═══════════════════════════
# This block MUST come after all API routes to avoid catching API calls.
STATIC_DIR = os_mod.path.join(os_mod.path.dirname(__file__), "static")
if os_mod.path.exists(STATIC_DIR):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    
    # 1. Mount the assets folder (where Vite puts JS/CSS)
    app.mount("/assets", StaticFiles(directory=os_mod.path.join(STATIC_DIR, "assets")), name="assets")
    
    # 2. Serve index.html for the root path
    @app.get("/", include_in_schema=False)
    def serve_root():
        return FileResponse(os_mod.path.join(STATIC_DIR, "index.html"))

    # 3. SPA Routing Catch-All (Return index.html for all other non-API routes)
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_react_app(full_path: str):
        # We don't want to catch /api calls here
        if full_path.startswith("api"):
             raise HTTPException(status_code=404, detail="API Route Not Found")
        return FileResponse(os_mod.path.join(STATIC_DIR, "index.html"))
