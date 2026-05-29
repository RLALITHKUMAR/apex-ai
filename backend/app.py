"""
app.py — Main Flask application entry point.

Run with:
    python backend/app.py
    -- or --
    flask --app backend/app run --debug
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from backend.database.db import init_db
from backend.routes.detection import detection_bp
from backend.routes.history import history_bp
from backend.routes.report import report_bp
from backend.routes.camera import camera_bp


def create_app() -> Flask:
    app = Flask(__name__)

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Allow React dev server (port 5173) and production origin
    CORS(app, resources={r"/api/*": {"origins": [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://your-netlify-app.netlify.app",
    ]}})

    # ── Config ────────────────────────────────────────────────────────────────
    app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH", 16 * 1024 * 1024))
    app.config["SECRET_KEY"]         = os.getenv("SECRET_KEY", "dev-secret-change-me")

    # ── Ensure directories exist ──────────────────────────────────────────────
    os.makedirs(os.getenv("UPLOAD_FOLDER",  "./uploads"), exist_ok=True)
    os.makedirs(os.getenv("REPORTS_FOLDER", "./reports"), exist_ok=True)
    os.makedirs("./trained_model", exist_ok=True)

    # ── Initialize DB ─────────────────────────────────────────────────────────
    init_db()

    # ── Register Blueprints ───────────────────────────────────────────────────
    app.register_blueprint(detection_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(camera_bp)

    # ── Health check ──────────────────────────────────────────────────────────
    @app.route("/api/health", methods=["GET"])
    def health():
        from backend.model.crack_model import is_model_ready
        return jsonify({
            "status":      "ok",
            "model_ready": is_model_ready(),
            "service":     "AI Crack Detection API",
            "version":     "1.0.0",
        }), 200

    # ── Serve uploaded images ─────────────────────────────────────────────────
    from flask import send_from_directory

    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        upload_dir = os.path.abspath(os.getenv("UPLOAD_FOLDER", "./uploads"))
        return send_from_directory(upload_dir, filename)

    # ── Serve frontend static files ───────────────────────────────────────────
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend"))
    
    @app.route("/")
    def serve_frontend_index():
        return send_from_directory(frontend_dir, "index.html")
    
    @app.route("/<path:path>")
    def serve_frontend_static(path):
        # Don't serve /api routes through frontend
        if path.startswith("api/"):
            return jsonify({"error": "Route not found."}), 404
        # Try to serve from frontend dist folder if it exists, otherwise serve from src
        dist_path = os.path.join(frontend_dir, "dist", path)
        src_path = os.path.join(frontend_dir, path)
        if os.path.exists(dist_path):
            return send_from_directory(os.path.join(frontend_dir, "dist"), path)
        elif os.path.exists(src_path):
            return send_from_directory(frontend_dir, path)
        else:
            # For SPA, serve index.html for unknown routes
            return send_from_directory(frontend_dir, "index.html")

    # ── Error handlers ────────────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Route not found."}), 404

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({"error": "File too large. Max 16 MB."}), 413

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error.", "detail": str(e)}), 500

    return app


if __name__ == "__main__":
    app  = create_app()
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    print(f"\n[START] AI Crack Detection API running at http://localhost:{port}")
    print(f"   Health check: http://localhost:{port}/api/health\n")
    app.run(host="0.0.0.0", port=port, debug=debug)
