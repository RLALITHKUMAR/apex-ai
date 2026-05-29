"""
crack_model.py — CNN model definition, loading, and prediction logic.

Architecture: Custom 4-block CNN trained from scratch.
Classes: [No Crack, Minor, Moderate, Severe]
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from pathlib import Path

CLASS_NAMES = ["No Crack", "Minor", "Moderate", "Severe"]
IMAGE_SIZE  = int(os.getenv("IMAGE_SIZE", 224))
MODEL_PATH  = os.getenv("MODEL_PATH", "./trained_model/crack_cnn.h5")

# Singleton model cache
_model_cache: keras.Model | None = None


# ── Model Definition ──────────────────────────────────────────────────────────
def build_crack_cnn(num_classes: int = 4, input_size: int = IMAGE_SIZE) -> keras.Model:
    """
    Build a custom CNN from scratch.
    No transfer learning — pure architecture as specified.
    """
    inputs = keras.Input(shape=(input_size, input_size, 3), name="image_input")

    # ── Block 1 ──────────────────────────────────────────────────────────────
    x = keras.layers.Conv2D(32, (3, 3), padding="same")(inputs)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Activation("relu")(x)
    x = keras.layers.Conv2D(32, (3, 3), padding="same")(x)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Activation("relu")(x)
    x = keras.layers.MaxPooling2D((2, 2))(x)
    x = keras.layers.Dropout(0.25)(x)

    # ── Block 2 ──────────────────────────────────────────────────────────────
    x = keras.layers.Conv2D(64, (3, 3), padding="same")(x)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Activation("relu")(x)
    x = keras.layers.Conv2D(64, (3, 3), padding="same")(x)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Activation("relu")(x)
    x = keras.layers.MaxPooling2D((2, 2))(x)
    x = keras.layers.Dropout(0.25)(x)

    # ── Block 3 ──────────────────────────────────────────────────────────────
    x = keras.layers.Conv2D(128, (3, 3), padding="same")(x)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Activation("relu")(x)
    x = keras.layers.Conv2D(128, (3, 3), padding="same")(x)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Activation("relu")(x)
    x = keras.layers.MaxPooling2D((2, 2))(x)
    x = keras.layers.Dropout(0.30)(x)

    # ── Block 4 ──────────────────────────────────────────────────────────────
    x = keras.layers.Conv2D(256, (3, 3), padding="same", name="last_conv")(x)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Activation("relu")(x)
    x = keras.layers.GlobalAveragePooling2D()(x)
    x = keras.layers.Dropout(0.40)(x)

    # ── Classifier ───────────────────────────────────────────────────────────
    x = keras.layers.Dense(512, activation="relu")(x)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Dropout(0.50)(x)
    x = keras.layers.Dense(256, activation="relu")(x)
    x = keras.layers.Dropout(0.40)(x)
    outputs = keras.layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = keras.Model(inputs, outputs, name="CrackDetectionCNN")
    return model


def compile_model(model: keras.Model, learning_rate: float = 1e-3) -> keras.Model:
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss="categorical_crossentropy",
        metrics=["accuracy",
                 keras.metrics.Precision(name="precision"),
                 keras.metrics.Recall(name="recall")],
    )
    return model


# ── Inference ─────────────────────────────────────────────────────────────────
def load_model(model_path: str = MODEL_PATH) -> keras.Model:
    """Load trained model from disk (cached singleton)."""
    global _model_cache
    if _model_cache is None:
        if not Path(model_path).exists():
            raise FileNotFoundError(
                f"Trained model not found at '{model_path}'.\n"
                "Run ai_training/train.py first to train the model."
            )
        _model_cache = keras.models.load_model(model_path)
        print(f"[Model] Loaded from: {model_path}")
    return _model_cache


def predict(
    preprocessed_image: np.ndarray,
    model: keras.Model = None,
) -> tuple[np.ndarray, int, str, float]:
    """
    Run inference on a preprocessed image batch.

    Args:
        preprocessed_image: np.ndarray of shape (1, H, W, 3), normalized [0,1]
        model: Optional pre-loaded model (will auto-load if None)

    Returns:
        (class_probs, pred_idx, pred_class, confidence)
    """
    if model is None:
        model = load_model()

    class_probs = model.predict(preprocessed_image, verbose=0)[0]  # shape: (4,)
    pred_idx    = int(np.argmax(class_probs))
    pred_class  = CLASS_NAMES[pred_idx]
    confidence  = float(class_probs[pred_idx])

    return class_probs, pred_idx, pred_class, confidence


def is_model_ready() -> bool:
    """Check if a trained model file exists."""
    return Path(MODEL_PATH).exists()
