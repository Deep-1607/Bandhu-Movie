import requests
try:
    r = requests.post("http://localhost:8000/api/register", json={"name":"test","username":"testuser1","password":"testpassword"})
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text}")
except Exception as e:
    print(f"Error: {e}")
