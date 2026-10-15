#!/usr/bin/env python3
"""
Monthly Expense Tracker - Live Local Sync Server
Binds the web application directly to Monthly_Expense_<Month>_<Year>.xlsx on disk.
Enables real-time two-way synchronization between Excel/LibreOffice and the web interface.
"""

import http.server
import socketserver
import urllib.parse
import json
import os
import calendar
import sys
import generate_excel

PORT = 5000
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.abspath(os.path.join(SCRIPTS_DIR, '..', 'src'))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPTS_DIR, '..'))

def get_xlsx_filename(year, month):
    month_name = calendar.month_name[month]
    # Check common naming conventions in scripts and root
    candidates = [
        f"Monthly_Expense_{month_name}_{year}.xlsx",
        f"Monthly_Expense_Tracker_{month_name}_{year}.xlsx",
        f"monthly_expense_{month_name.lower()}_{year}.xlsx"
    ]
    for c in candidates:
        for folder in [SCRIPTS_DIR, ROOT_DIR]:
            full_path = os.path.join(folder, c)
            if os.path.exists(full_path):
                return full_path
    # Default to SCRIPTS_DIR candidate
    return os.path.join(SCRIPTS_DIR, candidates[0])

class ExpenseTrackerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SRC_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # CORS headers
        if path == '/api/load':
            self.handle_api_load(query)
        elif path == '/api/check-update':
            self.handle_api_check_update(query)
        elif path == '/api/ping':
            self.send_json_response({"status": "online", "workspace": WORKSPACE_DIR})
        else:
            # Fallback to serving static files (index.html, styles.css, app.js, etc.)
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/save':
            self.handle_api_save()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_api_load(self, query):
        try:
            year = int(query.get('year', [2026])[0])
            month = int(query.get('month', [10])[0])
        except (ValueError, IndexError):
            year, month = 2026, 10

        target_file = get_xlsx_filename(year, month)
        if os.path.exists(target_file):
            data = generate_excel.parse_excel_workbook(target_file)
            if data:
                response = {
                    "success": True,
                    "connected": True,
                    "year": year,
                    "month": month,
                    "filename": os.path.basename(target_file),
                    "budget": data["budget"],
                    "daysData": data["days"],
                    "lastModified": data["lastModified"],
                    "isLocked": data["isLocked"]
                }
                self.send_json_response(response)
                return

        # If file doesn't exist yet, return empty template
        self.send_json_response({
            "success": False,
            "connected": True,
            "message": f"File {os.path.basename(target_file)} not found. Can be created upon save."
        })

    def handle_api_check_update(self, query):
        try:
            year = int(query.get('year', [2026])[0])
            month = int(query.get('month', [10])[0])
            client_mtime = float(query.get('lastModified', [0])[0])
        except (ValueError, IndexError):
            self.send_json_response({"modified": False})
            return

        target_file = get_xlsx_filename(year, month)
        if not os.path.exists(target_file):
            self.send_json_response({"modified": False, "exists": False})
            return

        current_mtime = os.path.getmtime(target_file)
        lock_file = os.path.join(WORKSPACE_DIR, f".~lock.{os.path.basename(target_file)}#")
        is_locked = os.path.exists(lock_file)

        # Allow small epsilon tolerance for float comparison
        modified = abs(current_mtime - client_mtime) > 0.5
        self.send_json_response({
            "modified": modified,
            "lastModified": current_mtime,
            "isLocked": is_locked
        })

    def handle_api_save(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_length)
            payload = json.loads(post_body.decode('utf-8'))

            year = int(payload.get('year', 2026))
            month = int(payload.get('month', 10))
            budget = float(payload.get('budget', 5000.0))
            days_data = payload.get('daysData', {})

            # Convert string keys to int keys
            cleaned_days = {}
            for k, v in days_data.items():
                try:
                    cleaned_days[int(k)] = v
                except ValueError:
                    pass

            target_file = get_xlsx_filename(year, month)
            generate_excel.create_excel_workbook(
                year=year,
                month=month,
                budget=budget,
                output_filename=target_file,
                days_data=cleaned_days
            )

            new_mtime = os.path.getmtime(target_file)
            self.send_json_response({
                "success": True,
                "message": f"Successfully updated {os.path.basename(target_file)}",
                "filename": os.path.basename(target_file),
                "lastModified": new_mtime
            })
        except Exception as e:
            self.send_json_response({
                "success": False,
                "error": str(e)
            }, status=500)

    def send_json_response(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run_server(port=PORT):
    # Allow socket reuse so restarts are instant
    socketserver.TCPServer.allow_reuse_address = True
    for p in [port, 8000, 8080]:
        try:
            with socketserver.TCPServer(("", p), ExpenseTrackerHandler) as httpd:
                print(f"Expense Tracker Live Sync Server running at http://localhost:{p}")
                print(f"Connected directory: {WORKSPACE_DIR}")
                httpd.serve_forever()
        except OSError:
            print(f"Port {p} in use, trying next...")
            continue

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run_server(port)
