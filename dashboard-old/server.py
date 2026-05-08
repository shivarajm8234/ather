#!/usr/bin/env python3
"""
Ather Voice Dashboard Server
Serves static files + /api/ip endpoint for local network IP detection.
"""

import http.server
import json
import socket
import os


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
