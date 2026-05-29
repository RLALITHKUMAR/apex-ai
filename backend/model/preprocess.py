"""
preprocess.py — Image preprocessing pipeline using OpenCV.
Prepares raw images for CNN inference.
"""

import cv2
import numpy as np
from PIL import Image
import io
import base64
import os

IMAGE_SIZE = int(os.getenv("IMAGE_SIZE", 224))


def preprocess_image(image_input, target_size: int = IMAGE_SIZE) -> np.ndarray:
    """
    Full preprocessing pipeline for a single image.

    Accepts:
        - numpy array (BGR, from cv2.imread)
        - PIL Image
        - bytes (raw image file bytes)
        - base64 string (from camera stream)

    Returns:
        np.ndarray of shape (1, target_size, target_size, 3) — normalized [0,1]
    """
    img_bgr = _to_bgr_array(image_input)

    # ── Step 1: Resize ───────────────────────────────────────────────────────
    img_bgr = cv2.resize(img_bgr, (target_size, target_size), interpolation=cv2.INTER_AREA)

    # ── Step 2: Denoise (gentle bilateral filter preserves edges) ────────────
    img_bgr = cv2.bilateralFilter(img_bgr, d=5, sigmaColor=35, sigmaSpace=35)

    # ── Step 3: CLAHE contrast enhancement on L channel (LAB colorspace) ────
    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    img_lab[:, :, 0] = clahe.apply(img_lab[:, :, 0])
    img_bgr = cv2.cvtColor(img_lab, cv2.COLOR_LAB2BGR)

    # ── Step 4: Convert BGR → RGB ────────────────────────────────────────────
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    # ── Step 5: Normalize to [0, 1] ──────────────────────────────────────────
    img_norm = img_rgb.astype(np.float32) / 255.0

    # ── Step 6: Add batch dimension ──────────────────────────────────────────
    return np.expand_dims(img_norm, axis=0)   # (1, H, W, 3)


def get_display_image(image_input, target_size: int = IMAGE_SIZE) -> np.ndarray:
    """
    Return a BGR numpy array for display / annotation purposes (no normalization).
    """
    img_bgr = _to_bgr_array(image_input)
    return cv2.resize(img_bgr, (target_size, target_size), interpolation=cv2.INTER_AREA)


def _to_bgr_array(image_input) -> np.ndarray:
    """Convert any supported input format to BGR numpy array."""
    if isinstance(image_input, np.ndarray):
        # Already numpy — assume BGR (from cv2) or RGB (from PIL)
        if image_input.ndim == 3 and image_input.shape[2] == 3:
            return image_input
        raise ValueError(f"Unexpected numpy shape: {image_input.shape}")

    if isinstance(image_input, Image.Image):
        return cv2.cvtColor(np.array(image_input.convert("RGB")), cv2.COLOR_RGB2BGR)

    if isinstance(image_input, (bytes, bytearray)):
        arr = np.frombuffer(image_input, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image bytes.")
        return img

    if isinstance(image_input, str):
        # Base64 string (from camera canvas.toDataURL)
        if "," in image_input:
            image_input = image_input.split(",", 1)[1]
        img_bytes = base64.b64decode(image_input)
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode base64 image.")
        return img

    raise TypeError(f"Unsupported image type: {type(image_input)}")


def encode_image_to_base64(img_bgr: np.ndarray, ext: str = ".jpg") -> str:
    """Encode BGR numpy array to base64 JPEG/PNG string for API response."""
    success, buffer = cv2.imencode(ext, img_bgr)
    if not success:
        raise ValueError("Image encoding failed.")
    return base64.b64encode(buffer).decode("utf-8")


def save_upload(file_bytes: bytes, save_path: str) -> str:
    """Save raw bytes to disk and return the path."""
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, "wb") as f:
        f.write(file_bytes)
    return save_path
