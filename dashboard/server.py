#!/usr/bin/env python3
"""
Ather Voice Dashboard Server
Serves static files + /api/ip endpoint for local network IP detection.
"""

import http.server
import json
import socket
import os
import hashlib
import pyotp


def get_local_ip():
    """Get the actual local network IP (not loopback, not public)."""
    try:
        # Create a UDP socket and connect to an external address
        # This doesn't actually send data, but reveals which interface would be used
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        pass

    # Fallback: scan hostname
    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        if not ip.startswith("127."):
            return ip
    except Exception:
        pass

    return "127.0.0.1"


class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    """Serves static files from dashboard/ and handles /api/ip."""

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))

        if self.path == "/api/login":
            try:
                with open("../users.json", "r") as f:
                    user_data = json.load(f)
                
                input_username = data.get("username")
                input_password = data.get("password")
                hashed_input = hashlib.sha256(input_password.encode()).hexdigest()

                if input_username == user_data["username"] and hashed_input == user_data["password_hash"]:
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "message": "Login valid, proceed to 2FA"}).encode())
                else:
                    self.send_response(401)
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": "Invalid credentials"}).encode())
            except Exception as e:
                self.send_error(500, str(e))

        elif self.path == "/api/verify-2fa":
            try:
                with open("../users.json", "r") as f:
                    user_data = json.load(f)
                
                code = data.get("code")
                totp = pyotp.TOTP(user_data["totp_secret"])
                
                # Allow 30 seconds window for clock skew
                is_valid = totp.verify(code, valid_window=1)
                
                print(f"DEBUG: Received 2FA code {code}. Valid: {is_valid}")
                if not is_valid:
                    print(f"DEBUG: Current server OTP is {totp.now()}")

                if is_valid:
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "user": {"name": "Alex Richardson", "role": "Showroom Manager"}}).encode())
                else:
                    self.send_response(401)
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": "Invalid 2FA code. Please check your authenticator clock."}).encode())
            except Exception as e:
                self.send_error(500, str(e))
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path == "/api/ip":
            ip = get_local_ip()
            response = json.dumps({"ip": ip})
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(response.encode())
        elif self.path == "/api/leads":
            try:
                with open("../leads.json", "r") as f:
                    response = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(response.encode())
            except Exception as e:
                self.send_error(500, str(e))
        elif self.path == "/api/service":
            try:
                with open("../service_records.json", "r") as f:
                    response = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(response.encode())
            except Exception as e:
                self.send_error(500, str(e))
        elif self.path == "/api/calls":
            try:
                calls_dir = "../calls"
                calls = []
                if os.path.exists(calls_dir):
                    for filename in os.listdir(calls_dir):
                        if filename.endswith(".json"):
                            with open(os.path.join(calls_dir, filename), "r") as f:
                                calls.append(json.load(f))
                calls.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
                response = json.dumps(calls)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(response.encode())
            except Exception as e:
                self.send_error(500, str(e))
        elif self.path == "/api/users":
            try:
                users_dir = "../users"
                users = []
                if os.path.exists(users_dir):
                    for filename in os.listdir(users_dir):
                        if filename.endswith(".json"):
                            with open(os.path.join(users_dir, filename), "r") as f:
                                users.append(json.load(f))
                response = json.dumps(users)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(response.encode())
            except Exception as e:
                self.send_error(500, str(e))
        elif self.path == "/api/knowledge":
            try:
                with open("../knowledge_graph.json", "r") as f:
                    response = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(response.encode())
            except Exception as e:
                self.send_error(500, str(e))
        elif self.path == "/api/staff":
            try:
                with open("../staff.json", "r") as f:
                    response = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(response.encode())
            except Exception as e:
                self.send_error(500, str(e))
        elif self.path == "/api/feedback":
            try:
                with open("../feedback.json", "r") as f:
                    response = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(response.encode())
            except Exception as e:
                self.send_error(500, str(e))
        else:
            super().do_GET()

    def log_message(self, format, *args):
        # Suppress noisy request logs
        pass


if __name__ == "__main__":
    PORT = 8000
    DIRECTORY = os.path.dirname(os.path.abspath(__file__))
    os.chdir(DIRECTORY)

    server = http.server.HTTPServer(("0.0.0.0", PORT), DashboardHandler)
    print(f"Dashboard server running on http://0.0.0.0:{PORT}")
    print(f"Local IP detected: {get_local_ip()}")
    server.serve_forever()
