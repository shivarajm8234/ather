import http.server
import socketserver
import json
import os
import socket
from datetime import datetime

PORT = 8001
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIRECTORY = os.path.join(BASE_DIR, 'dashboard')

import pyotp

class DashboardServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def _get_local_ip(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "127.0.0.1"

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        if self.path == '/api/login':
            data = json.loads(post_data)
            username = data.get('username')
            password = data.get('password')
            
            # Load from users.json if exists
            auth_success = False
            users_file = os.path.join(BASE_DIR, 'users.json')
            if os.path.exists(users_file):
                with open(users_file, 'r') as f:
                    u = json.load(f)
                    import hashlib
                    pwd_hash = hashlib.sha256(password.encode()).hexdigest()
                    if username == u.get('username') and pwd_hash == u.get('password_hash'):
                        auth_success = True
            
            # Legacy fallback for demo
            if username == 'admin' and password == 'ather123':
                auth_success = True
                
            if auth_success:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "message": "2FA Required"}).encode())
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Invalid Credentials"}).encode())
                
        elif self.path == '/api/verify-2fa':
            data = json.loads(post_data)
            code = str(data.get('code', '')).strip()
            
            auth_success = False
            user_details = {"name": "Admin User", "role": "Super Admin"}
            
            users_file = os.path.join(BASE_DIR, 'users.json')
            if os.path.exists(users_file):
                with open(users_file, 'r') as f:
                    u = json.load(f)
                    secret = u.get('totp_secret')
                    if secret:
                        totp = pyotp.TOTP(secret)
                        if totp.verify(code):
                            auth_success = True
                            user_details = {"name": u.get('name', 'Admin User'), "role": u.get('role', 'Super Admin')}
            
            # Legacy fallback
            if not auth_success and code == '123456':
                auth_success = True

            if auth_success:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "user": user_details}).encode())
            else:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Invalid 2FA Code. Check Google Authenticator."}).encode())
        elif self.path == '/api/staff/update':
            updated_staff_member = json.loads(post_data)
            staff_file = os.path.join(BASE_DIR, 'staff.json')
            if os.path.exists(staff_file):
                with open(staff_file, 'r') as f:
                    staff_list = json.load(f)
                
                for i, s in enumerate(staff_list):
                    if s['id'] == updated_staff_member['id']:
                        staff_list[i] = updated_staff_member
                        break
                
                with open(staff_file, 'w') as f:
                    json.dump(staff_list, f, indent=4)
                
                # Also set this as the active agent for the phone system
                with open(os.path.join(BASE_DIR, 'active_agent.json'), 'w') as f:
                    json.dump(updated_staff_member, f, indent=4)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode())
            else:
                self.send_response(404)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/'):
            endpoint = self.path.split('?')[0]
            
            if endpoint == '/api/ip':
                 self.send_response(200)
                 self.send_header('Content-Type', 'application/json')
                 self.end_headers()
                 self.wfile.write(json.dumps({"ip": self._get_local_ip()}).encode())
                 return

            mapping = {
                '/api/leads': os.path.join(BASE_DIR, 'leads.json'),
                '/api/service': os.path.join(BASE_DIR, 'service_records.json'),
                '/api/knowledge': os.path.join(BASE_DIR, 'knowledge_graph.json'),
                '/api/staff': os.path.join(BASE_DIR, 'staff.json'),
                '/api/feedback': os.path.join(BASE_DIR, 'feedback.json')
            }
            
            if endpoint == '/api/calls':
                 self.send_response(200)
                 self.send_header('Content-Type', 'application/json')
                 self.end_headers()
                 self.wfile.write(json.dumps(self._get_calls_data()).encode())
                 return

            file_path = mapping.get(endpoint)
            if file_path and os.path.exists(file_path):
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                with open(file_path, 'r') as f:
                    self.wfile.write(f.read().encode())
            else:
                self.send_response(404)
                self.end_headers()
            return

        # Static Files & SPA Fallback
        path = self.path.split('?')[0]
        if path == '/': path = '/index.html'
        
        local_path = os.path.join(DIRECTORY, path.lstrip('/'))
        if os.path.exists(local_path) and os.path.isfile(local_path):
            return super().do_GET()
        else:
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            index_path = os.path.join(DIRECTORY, 'index.html')
            if os.path.exists(index_path):
                with open(index_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(b"Index not found")

    def _get_calls_data(self):
        calls_dir = os.path.join(BASE_DIR, 'calls')
        if not os.path.exists(calls_dir): return []
        calls = []
        for f in os.listdir(calls_dir):
            if f.endswith('.json'):
                with open(os.path.join(calls_dir, f), 'r') as file:
                    try:
                        calls.append(json.load(file))
                    except:
                        pass
        return sorted(calls, key=lambda x: x.get('timestamp', ''), reverse=True)

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), DashboardServer) as httpd:
        print(f"Ather Dashboard Server running on port {PORT}")
        httpd.serve_forever()
