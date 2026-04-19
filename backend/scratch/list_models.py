import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

def list_my_models():
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    
    print("Listing models...")
    try:
        for model in client.models.list():
            print(f"Name: {model.name}, Supported: {model.supported_methods}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_my_models()
