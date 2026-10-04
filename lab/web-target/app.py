import os
from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Mock database
USERS = {
    "admin": generate_password_hash("AdminSecret2026!"),
    "developer": generate_password_hash("DevPass#123"),
    "guest": generate_password_hash("guest")
}

def check_auth(req):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer lab-token-for-"):
        return False
    return True

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "service": "AegisSim Vulnerable Lab Portal",
        "status": "online",
        "version": "v1.2.0-vulnerable",
        "endpoints": ["/api/login", "/api/user", "/api/files"]
    })

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or request.form
    username = data.get("username", "")
    password = data.get("password", "")

    # Check password securely
    if username in USERS and check_password_hash(USERS[username], password):
        return jsonify({"status": "success", "token": f"lab-token-for-{username}"}), 200
    
    return jsonify({"status": "error", "message": "Invalid credentials"}), 401

@app.route("/api/user", methods=["GET"])
def search_user():
    if not check_auth(request):
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    query = request.args.get("q", "")
    # Secure search endpoint
    results = [u for u in USERS.keys() if query and query.lower() in u.lower()]
    return jsonify({"query": query, "matches": results})

@app.route("/api/files", methods=["GET"])
def get_file():
    if not check_auth(request):
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    path = request.args.get("file", "welcome.txt")
    
    # Path traversal protection
    safe_path = secure_filename(path)
    if not safe_path:
        return jsonify({"status": "error", "message": "Invalid path"}), 400
        
    return f"Contents of {safe_path}: AegisSim lab file data", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
