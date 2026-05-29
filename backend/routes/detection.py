"""
detection.py — /api/detect-crack endpoint.
Full pipeline: upload → preprocess → CNN → severity → annotate → save DB.
"""

import os
import cv2
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

from backend.model.preprocess import preprocess_image, get_display_image, encode_image_to_base64, save_upload
from backend.model.crack_model import load_model, predict, is_model_ready, CLASS_NAMES
from backend.utils.severity import compute_severity, compute_crack_area
from backend.utils.heatmap import generate_gradcam, annotate_image
from backend.database.models import create_inspection, log_audit

detection_bp = Blueprint("detection", __name__)

UPLOAD_FOLDER  = os.getenv("UPLOAD_FOLDER", "./uploads")
ALLOWED_EXTS   = {"jpg", "jpeg", "png", "bmp", "webp"}
MAX_SIZE_BYTES = 16 * 1024 * 1024  # 16 MB


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTS


@detection_bp.route("/api/detect-crack", methods=["POST"])
def detect_crack():
    """
    POST /api/detect-crack
    Body: multipart/form-data with field 'image'
    Optional fields: source (upload|camera), location_tag, notes
    """
    # ── Validate model is ready ───────────────────────────────────────────────
    if not is_model_ready():
        return jsonify({
            "error": "Model not trained yet. Run ai_training/train.py first.",
            "code":  "MODEL_NOT_FOUND"
        }), 503

    # ── Validate request ──────────────────────────────────────────────────────
    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Use field name 'image'."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename."}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": f"File type not allowed. Use: {ALLOWED_EXTS}"}), 400

    img_bytes = file.read()
    if len(img_bytes) > MAX_SIZE_BYTES:
        return jsonify({"error": "File too large. Max 16 MB."}), 413

    # ── Save original upload ──────────────────────────────────────────────────
    inspection_id = str(uuid.uuid4())[:12].replace("-", "")
    ext           = secure_filename(file.filename).rsplit(".", 1)[-1].lower()
    original_name = f"{inspection_id}_original.{ext}"
    original_path = os.path.join(UPLOAD_FOLDER, original_name)
    save_upload(img_bytes, original_path)

    # ── Preprocess ────────────────────────────────────────────────────────────
    try:
        preprocessed = preprocess_image(img_bytes)
        display_img  = get_display_image(img_bytes)
    except Exception as e:
        return jsonify({"error": f"Image preprocessing failed: {str(e)}"}), 422

    # ── CNN Inference ─────────────────────────────────────────────────────────
    try:
        model = load_model()
        class_probs, pred_idx, pred_class, confidence = predict(preprocessed, model)
    except Exception as e:
        return jsonify({"error": f"Model inference failed: {str(e)}"}), 500

    # ── Crack area analysis ───────────────────────────────────────────────────
    crack_area_pct, contour_img = compute_crack_area(display_img)

    # ── Severity computation ──────────────────────────────────────────────────
    severity_data = compute_severity(class_probs, CLASS_NAMES, crack_area_pct)

    # ── Grad-CAM heatmap ──────────────────────────────────────────────────────
    try:
        heatmap = generate_gradcam(model, preprocessed, pred_idx)
        use_gradcam = True
    except Exception:
        heatmap = None
        use_gradcam = False

    # ── Annotate image ────────────────────────────────────────────────────────
    sev_meta     = severity_data
    color_bgr    = _hex_to_bgr(sev_meta["color_hex"])
    annotated    = annotate_image(
        contour_img,
        severity     = sev_meta["severity"],
        confidence   = sev_meta["confidence"],
        crack_area_pct = sev_meta["crack_area_pct"],
        color_bgr    = color_bgr,
        use_gradcam  = use_gradcam,
        heatmap      = heatmap,
    )

    # Save annotated image
    annotated_name = f"{inspection_id}_annotated.jpg"
    annotated_path = os.path.join(UPLOAD_FOLDER, annotated_name)
    cv2.imwrite(annotated_path, annotated)

    # ── Encode images for API response ────────────────────────────────────────
    original_b64  = encode_image_to_base64(display_img)
    annotated_b64 = encode_image_to_base64(annotated)

    # ── Save to DB ────────────────────────────────────────────────────────────
    db_data = {
        "id":              inspection_id,
        "original_path":   original_path,
        "annotated_path":  annotated_path,
        "crack_detected":  severity_data["crack_detected"],
        "severity":        severity_data["severity"],
        "confidence":      severity_data["confidence"],
        "crack_area_pct":  severity_data["crack_area_pct"],
        "recommendation":  severity_data["recommendation"],
        "source":          request.form.get("source", "upload"),
        "location_tag":    request.form.get("location_tag", ""),
        "notes":           request.form.get("notes", ""),
    }
    saved_id = create_inspection(db_data)
    log_audit("detect_crack", saved_id, f"severity={severity_data['severity']}")

    # ── Response ──────────────────────────────────────────────────────────────
    return jsonify({
        "inspection_id":    saved_id,
        "crack_detected":   severity_data["crack_detected"],
        "severity":         severity_data["severity"],
        "severity_label":   severity_data["severity_label"],
        "confidence":       severity_data["confidence"],
        "crack_area_pct":   severity_data["crack_area_pct"],
        "recommendation":   severity_data["recommendation"],
        "urgency":          severity_data["urgency"],
        "color_hex":        severity_data["color_hex"],
        "raw_probs":        severity_data["raw_probs"],
        "original_image":   f"data:image/jpeg;base64,{original_b64}",
        "annotated_image":  f"data:image/jpeg;base64,{annotated_b64}",
        "gradcam_applied":  use_gradcam,
    }), 200


def _hex_to_bgr(hex_color: str) -> tuple:
    hex_color = hex_color.lstrip("#")
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    return (b, g, r)  # OpenCV is BGR
