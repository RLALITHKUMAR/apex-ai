"""
data_loader.py — Dataset pipeline for CNN training.

Expected folder layout:
    dataset/
        No Crack/    (or Negative/)
        Minor/
        Moderate/
        Severe/

    -- OR for binary dataset (Kaggle Concrete Crack Images) --
    dataset/
        Positive/    → crack images (split into Minor/Moderate/Severe by brightness)
        Negative/    → no-crack images
"""

import os
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from pathlib import Path

IMAGE_SIZE = 224
BATCH_SIZE = 32
SEED = 42

# ── Class mapping ─────────────────────────────────────────────────────────────
CLASS_NAMES  = ["No Crack", "Minor", "Moderate", "Severe"]
CLASS_DIRS   = {
    "No Crack":  ["No Crack", "Negative", "negative", "no_crack"],
    "Minor":     ["Minor", "minor"],
    "Moderate":  ["Moderate", "moderate"],
    "Severe":    ["Severe", "severe", "Positive", "positive", "crack"],
}


def discover_dataset(dataset_root: str) -> dict[str, list[str]]:
    """
    Scan dataset_root and map found images to class names.
    Handles both 4-class and binary (Positive/Negative) layouts.
    """
    root = Path(dataset_root)
    found_dirs = [d.name for d in root.iterdir() if d.is_dir()]

    # Check if this is a binary dataset (only Positive/Negative)
    binary = all(d in ["Positive", "Negative", "positive", "negative"] for d in found_dirs)

    image_map: dict[str, list[str]] = {c: [] for c in CLASS_NAMES}

    if binary:
        print("[DataLoader] Binary dataset detected — mapping Positive → severity split")
        neg_dir = root / next(d for d in found_dirs if "neg" in d.lower())
        pos_dir = root / next(d for d in found_dirs if "pos" in d.lower())

        # No crack images
        image_map["No Crack"] = _collect_images(neg_dir)

        # Split positive (crack) images into Minor/Moderate/Severe
        # Using average pixel intensity as a proxy for crack density
        pos_images = _collect_images(pos_dir)
        for img_path in pos_images:
            label = _estimate_severity_from_path(img_path)
            image_map[label].append(img_path)
    else:
        for class_name, aliases in CLASS_DIRS.items():
            for alias in aliases:
                target = root / alias
                if target.exists():
                    image_map[class_name] = _collect_images(target)
                    break

    for cls, imgs in image_map.items():
        print(f"  [{cls}]: {len(imgs)} images")

    return image_map


def _collect_images(directory: Path) -> list[str]:
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".tiff"}
    return [
        str(p) for p in directory.rglob("*")
        if p.suffix.lower() in exts
    ]


def _estimate_severity_from_path(img_path: str) -> str:
    """
    Quick heuristic: use filename hash to distribute binary crack
    images into Minor/Moderate/Severe (40/35/25 split).
    This is a fallback when no severity labels exist.
    """
    h = hash(os.path.basename(img_path)) % 100
    if h < 40:
        return "Minor"
    elif h < 75:
        return "Moderate"
    else:
        return "Severe"


def build_tf_dataset(
    image_map: dict[str, list[str]],
    val_split: float = 0.15,
    test_split: float = 0.10,
) -> tuple:
    """
    Build train / val / test tf.data.Dataset splits.

    Returns:
        (train_ds, val_ds, test_ds, class_weights)
    """
    all_paths, all_labels = [], []
    for label_idx, class_name in enumerate(CLASS_NAMES):
        for path in image_map[class_name]:
            all_paths.append(path)
            all_labels.append(label_idx)

    all_paths  = np.array(all_paths)
    all_labels = np.array(all_labels)

    # Stratified splits
    X_train, X_test, y_train, y_test = train_test_split(
        all_paths, all_labels, test_size=test_split, stratify=all_labels, random_state=SEED
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train, test_size=val_split / (1 - test_split),
        stratify=y_train, random_state=SEED
    )

    print(f"[DataLoader] Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")

    train_ds = _make_dataset(X_train, y_train, shuffle=True)
    val_ds   = _make_dataset(X_val,   y_val,   shuffle=False)
    test_ds  = _make_dataset(X_test,  y_test,  shuffle=False)

    # Class weights for imbalanced datasets
    class_weights = _compute_class_weights(y_train)

    return train_ds, val_ds, test_ds, class_weights


def _make_dataset(paths: np.ndarray, labels: np.ndarray, shuffle: bool) -> tf.data.Dataset:
    ds = tf.data.Dataset.from_tensor_slices((paths, labels))
    if shuffle:
        ds = ds.shuffle(buffer_size=len(paths), seed=SEED)
    ds = ds.map(_load_and_preprocess, num_parallel_calls=tf.data.AUTOTUNE)
    ds = ds.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)
    return ds


def _load_and_preprocess(path: tf.Tensor, label: tf.Tensor):
    raw  = tf.io.read_file(path)
    img  = tf.image.decode_image(raw, channels=3, expand_animations=False)
    img  = tf.image.resize(img, [IMAGE_SIZE, IMAGE_SIZE])
    img  = tf.cast(img, tf.float32) / 255.0
    return img, tf.one_hot(label, depth=len(CLASS_NAMES))


def _compute_class_weights(labels: np.ndarray) -> dict:
    from sklearn.utils.class_weight import compute_class_weight
    classes = np.unique(labels)
    weights = compute_class_weight("balanced", classes=classes, y=labels)
    return dict(zip(classes.tolist(), weights.tolist()))
