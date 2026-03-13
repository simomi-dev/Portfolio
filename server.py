#!/usr/bin/env python3
"""
Simo Miklos Portfolio — Backend Server
Run: python server.py
Then open: http://localhost:3030
"""

import json
import hashlib
import os
import shutil
import uuid
import re
import time
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path

# ──────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────
BASE_DIR      = Path(__file__).parent.resolve()
PROJECTS_FILE = BASE_DIR / "projects" / "projects.json"
CONFIG_FILE   = BASE_DIR / "config.json"
PORT          = 3000

# Valid image/video extensions for upload
ALLOWED_EXT = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov'}

# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────
def load_config():
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_projects():
    if not PROJECTS_FILE.exists():
        PROJECTS_FILE.parent.mkdir(parents=True, exist_ok=True)
        default = {"categories": [], "projects": []}
        with open(PROJECTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(default, f, ensure_ascii=False, indent=2)
        return default
    with open(PROJECTS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_projects(data):
    with open(PROJECTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def sha256(s):
    return hashlib.sha256(s.encode()).hexdigest()

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'\s+', '-', text.strip())
    return text[:48]

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    }

# Active sessions: { token: expiry_timestamp }
SESSIONS = {}
SESSION_TTL = 8 * 3600  # 8 hours

def create_session():
    token = str(uuid.uuid4())
    SESSIONS[token] = time.time() + SESSION_TTL
    return token

def validate_session(token):
    if not token:
        return False
    expiry = SESSIONS.get(token)
    if expiry and time.time() < expiry:
        return True
    SESSIONS.pop(token, None)
    return False

def parse_multipart(body, boundary):
    """Parse multipart/form-data. Returns dict of fields and list of file dicts."""
    fields = {}
    files  = []
    boundary_bytes = ('--' + boundary).encode()
    parts = body.split(boundary_bytes)
    for part in parts[1:]:
        if part in (b'--\r\n', b'--'):
            continue
        if part.startswith(b'\r\n'):
            part = part[2:]
        if part.endswith(b'\r\n--'):
            part = part[:-4]
        elif part.endswith(b'\r\n'):
            part = part[:-2]
        # Split header/body
        sep = part.find(b'\r\n\r\n')
        if sep == -1:
            continue
        header_block = part[:sep].decode('utf-8', errors='replace')
        body_bytes   = part[sep+4:]
        # Parse Content-Disposition
        name     = re.search(r'name="([^"]*)"',     header_block)
        filename = re.search(r'filename="([^"]*)"', header_block)
        ctype    = re.search(r'Content-Type:\s*(\S+)', header_block, re.I)
        name     = name.group(1) if name else ''
        filename = filename.group(1) if filename else ''
        ctype    = ctype.group(1) if ctype else 'application/octet-stream'
        if filename:
            files.append({'name': name, 'filename': filename, 'content_type': ctype, 'data': body_bytes})
        else:
            fields[name] = body_bytes.decode('utf-8', errors='replace')
    return fields, files

# ──────────────────────────────────────────────
# REQUEST HANDLER
# ──────────────────────────────────────────────
class Handler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        # Quiet log, only show errors and API calls
        if '/api/' in args[0] if args else False:
            print(f"[API] {fmt % args}")

    def send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        for k, v in cors_headers().items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def send_static(self, file_path):
        try:
            with open(file_path, 'rb') as f:
                data = f.read()
            mime, _ = mimetypes.guess_type(str(file_path))
            self.send_response(200)
            self.send_header('Content-Type', mime or 'application/octet-stream')
            self.send_header('Content-Length', len(data))
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(data)
        except FileNotFoundError:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')

    def get_token(self):
        return self.headers.get('X-Admin-Token', '')

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in cors_headers().items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip('/')

        # ── API routes ──
        if path == '/api/projects':
            data = load_projects()
            self.send_json(200, data)
            return

        if path == '/api/categories':
            data = load_projects()
            self.send_json(200, {'categories': data.get('categories', [])})
            return

        if path == '/api/session':
            token = self.get_token()
            valid = validate_session(token)
            self.send_json(200, {'authenticated': valid})
            return

        # ── Static files ──
        # Map URL path to filesystem
        rel = path.lstrip('/')
        if not rel:
            rel = 'index.html'
        file_path = BASE_DIR / rel
        if file_path.is_dir():
            file_path = file_path / 'index.html'
        self.send_static(file_path)

    def do_POST(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip('/')

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length else b''

        # ── LOGIN ──
        if path == '/api/login':
            try:
                payload  = json.loads(body)
                password = payload.get('password', '')
                config   = load_config()
                expected = config['admin']['password_hash']
                if sha256(password) == expected:
                    token = create_session()
                    self.send_json(200, {'ok': True, 'token': token})
                else:
                    self.send_json(401, {'ok': False, 'error': 'Invalid password'})
            except Exception as e:
                self.send_json(400, {'ok': False, 'error': str(e)})
            return

        # ── LOGOUT ──
        if path == '/api/logout':
            token = self.get_token()
            SESSIONS.pop(token, None)
            self.send_json(200, {'ok': True})
            return

        # All routes below require auth
        if not validate_session(self.get_token()):
            self.send_json(401, {'ok': False, 'error': 'Unauthorized'})
            return

        # ── CREATE PROJECT ──
        if path == '/api/projects':
            try:
                payload     = json.loads(body)
                title       = payload.get('title', '').strip()
                description = payload.get('description', '').strip()
                category    = payload.get('category', '').strip()
                category_id = payload.get('categoryId', '').strip()
                tags        = payload.get('tags', [])
                year        = payload.get('year', '2025')
                project_id  = slugify(title) or str(uuid.uuid4())[:8]

                # Ensure unique id
                db = load_projects()
                existing_ids = {p['id'] for p in db['projects']}
                base_id = project_id
                counter = 1
                while project_id in existing_ids:
                    project_id = f"{base_id}-{counter}"
                    counter += 1

                folder = f"projects/{project_id}"
                (BASE_DIR / folder / 'images').mkdir(parents=True, exist_ok=True)

                new_proj = {
                    'id': project_id,
                    'title': title,
                    'categoryId': category_id,
                    'category': category,
                    'tags': tags,
                    'description': description,
                    'year': year,
                    'folder': folder
                }
                db['projects'].append(new_proj)
                save_projects(db)
                self.send_json(201, {'ok': True, 'project': new_proj})
            except Exception as e:
                self.send_json(400, {'ok': False, 'error': str(e)})
            return

        # ── CREATE CATEGORY ──
        if path == '/api/categories':
            try:
                payload  = json.loads(body)
                label    = payload.get('label', '').strip()
                icon     = payload.get('icon', '◈')
                if not label:
                    self.send_json(400, {'ok': False, 'error': 'Label required'})
                    return
                cat_id = slugify(label) or str(uuid.uuid4())[:8]
                db = load_projects()
                cats = db.get('categories', [])
                if any(c['id'] == cat_id for c in cats):
                    self.send_json(409, {'ok': False, 'error': 'Category already exists'})
                    return
                new_cat = {'id': cat_id, 'label': label, 'icon': icon}
                cats.append(new_cat)
                db['categories'] = cats
                save_projects(db)
                self.send_json(201, {'ok': True, 'category': new_cat})
            except Exception as e:
                self.send_json(400, {'ok': False, 'error': str(e)})
            return

        # ── UPLOAD FILES ──
        if path.startswith('/api/upload/'):
            project_id = path.split('/')[-1]
            db = load_projects()
            proj = next((p for p in db['projects'] if p['id'] == project_id), None)
            if not proj:
                self.send_json(404, {'ok': False, 'error': 'Project not found'})
                return

            content_type = self.headers.get('Content-Type', '')
            boundary_match = re.search(r'boundary=([^\s;]+)', content_type)
            if not boundary_match:
                self.send_json(400, {'ok': False, 'error': 'No boundary'})
                return

            boundary = boundary_match.group(1)
            _, files = parse_multipart(body, boundary)

            images_dir = BASE_DIR / proj['folder'] / 'images'
            images_dir.mkdir(parents=True, exist_ok=True)

            # Get next available number
            existing = sorted([
                int(f.stem) for f in images_dir.iterdir()
                if f.stem.isdigit()
            ]) if images_dir.exists() else []
            next_num = (existing[-1] + 1) if existing else 1

            saved = []
            for file_info in files:
                ext = Path(file_info['filename']).suffix.lower()
                if ext not in ALLOWED_EXT:
                    continue
                out_name = f"{next_num}{ext}"
                out_path = images_dir / out_name
                out_path.write_bytes(file_info['data'])
                saved.append(out_name)
                next_num += 1

            self.send_json(200, {'ok': True, 'saved': saved})
            return

        self.send_json(404, {'ok': False, 'error': 'Not found'})

    def do_PUT(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip('/')

        if not validate_session(self.get_token()):
            self.send_json(401, {'ok': False, 'error': 'Unauthorized'})
            return

        # ── UPDATE PROJECT ──
        if path.startswith('/api/projects/'):
            project_id = path.split('/')[-1]
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                payload = json.loads(body)
                db = load_projects()
                for i, p in enumerate(db['projects']):
                    if p['id'] == project_id:
                        # Update allowed fields
                        for key in ('title', 'description', 'category', 'categoryId', 'tags', 'year'):
                            if key in payload:
                                db['projects'][i][key] = payload[key]
                        save_projects(db)
                        self.send_json(200, {'ok': True, 'project': db['projects'][i]})
                        return
                self.send_json(404, {'ok': False, 'error': 'Not found'})
            except Exception as e:
                self.send_json(400, {'ok': False, 'error': str(e)})
            return

        self.send_json(404, {'ok': False, 'error': 'Not found'})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip('/')

        if not validate_session(self.get_token()):
            self.send_json(401, {'ok': False, 'error': 'Unauthorized'})
            return

        # ── DELETE PROJECT ──
        if path.startswith('/api/projects/'):
            project_id = path.split('/')[-1]
            db = load_projects()
            proj = next((p for p in db['projects'] if p['id'] == project_id), None)
            if not proj:
                self.send_json(404, {'ok': False, 'error': 'Not found'})
                return
            # Remove folder
            proj_dir = BASE_DIR / proj['folder']
            if proj_dir.exists():
                shutil.rmtree(proj_dir)
            db['projects'] = [p for p in db['projects'] if p['id'] != project_id]
            save_projects(db)
            self.send_json(200, {'ok': True})
            return

        # ── DELETE SINGLE IMAGE ──
        if path.startswith('/api/image/'):
            # /api/image/<project_id>/<filename>
            parts = path.split('/')
            if len(parts) >= 5:
                project_id = parts[3]
                filename   = parts[4]
                db = load_projects()
                proj = next((p for p in db['projects'] if p['id'] == project_id), None)
                if proj:
                    img_path = BASE_DIR / proj['folder'] / 'images' / filename
                    if img_path.exists():
                        img_path.unlink()
                        self.send_json(200, {'ok': True})
                        return
                self.send_json(404, {'ok': False, 'error': 'Not found'})
                return

        self.send_json(404, {'ok': False, 'error': 'Not found'})


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────
if __name__ == '__main__':
    # Bind to 0.0.0.0 to allow access from other devices on the local network (e.g. 192.168.x.x)
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    print(f"\n  ======================================")
    print(f"  = SIMO MIKLOS PORTFOLIO SERVER       =")
    print(f"  = Internal: http://localhost:{PORT}     =")
    print(f"  = External: http://<Your-Local-IP>:{PORT} =")
    print(f"  = Admin password: 123123             =")
    print(f"  ======================================\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
