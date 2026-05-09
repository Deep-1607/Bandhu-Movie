import os
import sys
import uvicorn

if __name__ == "__main__":
    # Force Python to recognize the backend folder
    sys.path.insert(0, os.path.abspath("backend"))
    os.chdir("backend")
    
    port = int(os.environ.get("PORT", 8000))
    print(f"--- AUTO-START SCRIPT ENGAGED ON PORT {port} ---")
    
    try:
        uvicorn.run("main:app", host="0.0.0.0", port=port)
    except Exception as e:
        print(f"CRITICAL CRASH: {e}")
