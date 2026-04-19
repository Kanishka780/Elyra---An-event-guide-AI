import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

def test_inference():
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    print(f"Using API Key starting with: {api_key[:10]}...")
    
    try:
        client = genai.Client(api_key=api_key)
        
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents="Hello! Tell me about the event.",
            config=types.GenerateContentConfig(
                system_instruction="You are a helpful assistant.",
                response_mime_type="application/json",
            ),
        )
        print("--- SUCCESS ---")
        print(response.text)
    except Exception as e:
        print("--- FAILURE ---")
        print(f"Error type: {type(e)}")
        print(f"Error message: {str(e)}")

if __name__ == "__main__":
    test_inference()
