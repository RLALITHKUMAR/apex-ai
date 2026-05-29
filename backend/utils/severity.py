"""
severity.py — Crack severity analysis and recommendation engine.

Strategy:
  - CNN output gives class probabilities [No Crack, Minor, Moderate, Severe]
  - OpenCV crack area analysis gives structural confirmation
  - Both are combined for a robust final severity verdict
"""

import cv2
import numpy as np


# ── Severity Metadata ─────────────────────────────────────────────────────────
SEVERITY_CONFIG = {
    "No Crack": {
        "label":          "No Crack",
        "level":          0,
        "color_bgr":      (0, 200, 100),     # green
        "color_hex":      "#00c864",
        "recommendation": "No cracks detected. Continue routine monitoring every 6 months.",
        "urgency":        "routine",
    },
    "Minor": {
        "label":          "Minor Crack",
        "level":          1,
        "color_bgr":      (0, 210, 255),     # yellow-ish (BGR)
        "color_hex":      "#ffd600",
        "recommendation": "Minor surface crack detected. Monitor for growth. Schedule inspection within 3 months.",
        "urgency":        "low",
    },
    "Moderate": {
        "label":          "Moderate Crack",
        "level":          2,
        "color_bgr":      (0, 120, 255),     # orange (BGR)
        "color_hex":      "#ff7800",
        "recommendation": "Moderate structural crack. Schedule professional inspection within 30 days.",
        "urgency":        "medium",
    },
    "Severe": {
        "label":          "Severe Crack",
        "level":          3,
        "color_bgr":      (0, 0, 220),       # red (BGR)
        "color_hex":      "#e53935",
        "recommendation": "CRITICAL: Severe structural damage detected. Immediate professional inspection required. Consider evacuation assessment.",
        "urgency":        "critical",
    },
}


def compute_severity(
    class_probs: np.ndarray,
    class_names: list,
    crack_area_pct: float,
) -> dict:
    """
    Combine CNN probability output with crack area for a final severity result.

    Args:
        class_probs:   Softmax probabilities, shape (4,) — [No Crack, Minor, Moderate, Severe]
        class_names:   List of class name strings matching model output order
        crack_area_pct: Crack pixel area as a percentage of total image area

    Returns:
        dict with severity, confidence, crack_area_pct, recommendation, and meta
    """
    # ── Raw model prediction ─────────────────────────────────────────────────
    pred_idx = int(np.argmax(class_probs))
    pred_class = class_names[pred_idx]
    confidence = float(class_probs[pred_idx])

    # ── Determine if crack detected at all ───────────────────────────────────
    no_crack_prob = float(class_probs[class_names.index("No Crack")]) if "No Crack" in class_names else 0.0
    crack_detected = pred_class != "No Crack" or crack_area_pct > 2.0

    # ── Area-based override: strong visual evidence overrides low confidence ─
    if crack_area_pct > 35.0 and pred_class in ("No Crack", "Minor"):
        pred_class = "Severe"
        confidence = max(confidence, 0.75)
    elif crack_area_pct > 15.0 and pred_class in ("No Crack", "Minor"):
        pred_class = "Moderate"
        confidence = max(confidence, 0.70)
    elif crack_area_pct > 5.0 and pred_class == "No Crack":
        pred_class = "Minor"
        confidence = max(confidence, 0.65)

    # ── No crack threshold: if area < 1% and model says No Crack, confirm ───
    if crack_area_pct < 1.0 and no_crack_prob > 0.85:
        pred_class = "No Crack"
        crack_detected = False

    severity_meta = SEVERITY_CONFIG[pred_class]

    return {
        "crack_detected":   crack_detected,
        "severity":         pred_class,
        "severity_label":   severity_meta["label"],
        "confidence":       round(confidence * 100, 2),       # as percentage
        "crack_area_pct":   round(crack_area_pct, 2),
        "recommendation":   severity_meta["recommendation"],
        "urgency":          severity_meta["urgency"],
        "color_hex":        severity_meta["color_hex"],
        "severity_level":   severity_meta["level"],           # 0–3 for sorting
        "raw_probs": {
            name: round(float(prob) * 100, 2)
            for name, prob in zip(class_names, class_probs)
        },
    }


def compute_crack_area(img_bgr: np.ndarray) -> tuple[float, np.ndarray]:
    """
    Use OpenCV to detect crack pixels and return:
      - crack_area_pct: percentage of image that is crack
      - contour_img:    BGR image with crack contours drawn in red

    Returns:
        (crack_area_pct, annotated_bgr_image)
    """
    h, w = img_bgr.shape[:2]
    total_pixels = h * w

    # Convert to grayscale
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Adaptive threshold to isolate dark crack regions
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=11,
        C=4
    )

    # Morphological cleanup to remove noise
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Find contours
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Filter tiny noise contours (< 0.01% of image area)
    min_area = total_pixels * 0.0001
    valid_contours = [c for c in contours if cv2.contourArea(c) > min_area]

    # Calculate crack area
    crack_pixels = sum(cv2.contourArea(c) for c in valid_contours)
    crack_area_pct = (crack_pixels / total_pixels) * 100.0

    # Draw annotated image
    annotated = img_bgr.copy()
    if valid_contours:
        cv2.drawContours(annotated, valid_contours, -1, (0, 0, 255), 2)  # Red contours
        # Add semi-transparent red overlay on crack regions
        overlay = annotated.copy()
        cv2.drawContours(overlay, valid_contours, -1, (0, 0, 200), -1)   # filled
        cv2.addWeighted(overlay, 0.3, annotated, 0.7, 0, annotated)

    return crack_area_pct, annotated
