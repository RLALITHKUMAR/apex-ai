"""
camera.py — Live camera frame detection endpoint.
Accepts base64-encoded frames from the React webcam feed.
"""

import os
import cv2
import uuid
from flask import Blueprint, request, jsonify

from backend.model.preprocess import preprocess_image, get_display_image, encode_image_to_base64, save_upload
from backend.model.crack_model import load_model, predict, is_model_ready, CLASS_NAMES
from backend.utils.severity import compute_severity, compute_crack_area
from backend.utils.heatmap import generate_gradcam, annotate_image
from backend.database.models import create_inspection

camera_bp = Blueprint("camera", __name__)

UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")


@camera_bp.route("/api/camera/detect", methods=["POST"])
def camera_detect():
    """
    POST /api/camera/detect
    Body JSON: { "frame": "<base64 image string>", "save": true/false }

    Returns detection result with annotated frame.
    Used for live camera analysis from the React frontend.
    """
    if not is_model_ready():
        return jsonify({"error": "Model not ready.", "code": "MODEL_NOT_FOUND"}), 503

    data  = request.get_json(silent=True)
    if not data or "frame" not in data:
        return jsonify({"error": "Missing 'frame' field in JSON body."}), 400

    frame_b64 = data["frame"]
    save_flag = data.get("save", False)    # whether to persist to DB

    # ── Preprocess ────────────────────────────────────────────────────────────
    try:
        preprocessed = preprocess_image(frame_b64)   # handles base64 string
        display_img  = get_display_image(frame_b64)
    except Exception as e:
        return jsonify({"error": f"Frame decode failed: {str(e)}"}), 422

    # ── Inference ─────────────────────────────────────────────────────────────
    try:
        model = load_model()
        class_probs, pred_idx, pred_class, confidence = predict(preprocessed, model)
    except Exception as e:
        return jsonify({"error": f"Inference error: {str(e)}"}), 500

    # ── Analysis ──────────────────────────────────────────────────────────────
    crack_area_pct, contour_img = compute_crack_area(display_img)
    severity_data = compute_severity(class_probs, CLASS_NAMES, crack_area_pct)

    # ── Annotation (no Grad-CAM for live frames — too slow) ───────────────────
    color_bgr  = _hex_to_bgr(severity_data["color_hex"])
    annotated  = annotate_image(
        contour_img,
        severity       = severity_data["severity"],
        confidence     = severity_data["confidence"],
        crack_area_pct = severity_data["crack_area_pct"],
        color_bgr      = color_bgr,
        use_gradcam    = False,
    )
    annotated_b64 = encode_image_to_base64(annotated)

    # ── Optionally save to DB ─────────────────────────────────────────────────
    inspection_id = None
    if save_flag:
        inspection_id = str(uuid.uuid4())[:12].replace("-", "")
        save_path = os.path.join(UPLOAD_FOLDER, f"{inspection_id}_camera.jpg")
        cv2.imwrite(save_path, display_img)
        ann_path  = os.path.join(UPLOAD_FOLDER, f"{inspection_id}_camera_ann.jpg")
        cv2.imwrite(ann_path, annotated)

        inspection_id = create_inspection({
            "id":             inspection_id,
            "original_path":  save_path,
            "annotated_path": ann_path,
            "crack_detected": severity_data["crack_detected"],
            "severity":       severity_data["severity"],
            "confidence":     severity_data["confidence"],
            "crack_area_pct": severity_data["crack_area_pct"],
            "recommendation": severity_data["recommendation"],
            "source":         "camera",
            "location_tag":   data.get("location_tag", ""),
            "notes":          data.get("notes", ""),
        })

    return jsonify({
        "inspection_id":  inspection_id,
        "crack_detected": severity_data["crack_detected"],
        "severity":       severity_data["severity"],
        "confidence":     severity_data["confidence"],
        "crack_area_pct": severity_data["crack_area_pct"],
        "recommendation": severity_data["recommendation"],
        "urgency":        severity_data["urgency"],
        "color_hex":      severity_data["color_hex"],
        "annotated_image":f"data:image/jpeg;base64,{annotated_b64}",
        "raw_probs":      severity_data["raw_probs"],
    }), 200


def _hex_to_bgr(hex_color: str) -> tuple:
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (b, g, r)
