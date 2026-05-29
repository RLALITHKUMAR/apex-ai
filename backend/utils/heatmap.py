"""
heatmap.py — Grad-CAM heatmap overlay for crack visualization.
Highlights which regions in the image the CNN focused on.
"""

import cv2
import numpy as np
import tensorflow as tf
from tensorflow import keras


def generate_gradcam(
    model: keras.Model,
    preprocessed_image: np.ndarray,
    pred_class_idx: int,
    last_conv_layer_name: str = "last_conv",
) -> np.ndarray:
    """
    Generate a Grad-CAM heatmap for the predicted class.

    Args:
        model:                Loaded Keras model
        preprocessed_image:  Shape (1, H, W, 3), normalized [0,1]
        pred_class_idx:       Index of predicted class
        last_conv_layer_name: Name of the last Conv2D layer in the model

    Returns:
        heatmap: np.ndarray of shape (H, W), values in [0, 1]
    """
    # Build sub-model: input → last conv layer output + final predictions
    grad_model = keras.Model(
        inputs=model.input,
        outputs=[
            model.get_layer(last_conv_layer_name).output,
            model.output,
        ],
    )

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(preprocessed_image, training=False)
        class_score = predictions[:, pred_class_idx]

    # Gradients of class score w.r.t. conv feature maps
    grads = tape.gradient(class_score, conv_outputs)         # (1, h, w, C)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))     # (C,)

    # Weight each feature map channel by pooled gradient
    conv_outputs = conv_outputs[0]                           # (h, w, C)
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]   # (h, w, 1)
    heatmap = tf.squeeze(heatmap)                            # (h, w)

    # ReLU + normalize to [0, 1]
    heatmap = tf.maximum(heatmap, 0)
    heatmap_max = tf.reduce_max(heatmap)
    if heatmap_max > 0:
        heatmap = heatmap / heatmap_max

    return heatmap.numpy()


def overlay_heatmap_on_image(
    original_bgr: np.ndarray,
    heatmap: np.ndarray,
    alpha: float = 0.45,
    colormap: int = cv2.COLORMAP_JET,
) -> np.ndarray:
    """
    Overlay a Grad-CAM heatmap onto the original BGR image.

    Returns:
        BGR image with colored heatmap overlay
    """
    h, w = original_bgr.shape[:2]

    # Resize heatmap to match original image
    heatmap_resized = cv2.resize(heatmap, (w, h))

    # Convert to uint8 and apply colormap
    heatmap_uint8  = np.uint8(255 * heatmap_resized)
    heatmap_color  = cv2.applyColorMap(heatmap_uint8, colormap)

    # Blend
    overlaid = cv2.addWeighted(original_bgr, 1 - alpha, heatmap_color, alpha, 0)
    return overlaid


def annotate_image(
    original_bgr: np.ndarray,
    severity: str,
    confidence: float,
    crack_area_pct: float,
    color_bgr: tuple = (0, 0, 220),
    use_gradcam: bool = False,
    heatmap: np.ndarray = None,
) -> np.ndarray:
    """
    Full annotation pipeline:
    1. (Optional) Overlay Grad-CAM heatmap
    2. Draw severity label banner at top

    Returns:
        Annotated BGR image
    """
    img = original_bgr.copy()

    # Apply heatmap if available
    if use_gradcam and heatmap is not None:
        img = overlay_heatmap_on_image(img, heatmap, alpha=0.4)

    h, w = img.shape[:2]

    # ── Top banner ───────────────────────────────────────────────────────────
    banner_h = 42
    banner   = np.zeros((banner_h, w, 3), dtype=np.uint8)
    cv2.rectangle(banner, (0, 0), (w, banner_h), color_bgr, -1)

    label_text = f"{severity}  |  Conf: {confidence:.1f}%  |  Area: {crack_area_pct:.1f}%"
    font_scale = 0.55
    thickness  = 1
    text_size  = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)[0]
    text_x     = max(8, (w - text_size[0]) // 2)
    cv2.putText(
        banner, label_text,
        (text_x, 28),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_scale, (255, 255, 255), thickness, cv2.LINE_AA
    )

    # Stack banner above image
    annotated = np.vstack([banner, img])
    return annotated
