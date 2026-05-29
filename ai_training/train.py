"""
train.py — CNN training script.

Usage:
    python ai_training/train.py --dataset ./dataset --epochs 50 --batch 32

Dataset layout:
    dataset/
        No Crack/  (or Negative/)
        Minor/
        Moderate/
        Severe/     (or Positive/)
"""

import os
import sys
import argparse
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow import keras
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ai_training.data_loader import discover_dataset, build_tf_dataset, CLASS_NAMES
from ai_training.augmentation import get_augmentation_layer, add_gaussian_noise
from backend.model.crack_model import build_crack_cnn, compile_model

MODEL_SAVE_DIR = "./trained_model"


def parse_args():
    p = argparse.ArgumentParser(description="Train Crack Detection CNN")
    p.add_argument("--dataset", type=str, default="./dataset", help="Path to dataset root")
    p.add_argument("--epochs",  type=int, default=50,          help="Number of epochs")
    p.add_argument("--batch",   type=int, default=32,          help="Batch size")
    p.add_argument("--lr",      type=float, default=1e-3,      help="Initial learning rate")
    p.add_argument("--imgsize", type=int, default=224,          help="Input image size")
    p.add_argument("--output",  type=str, default=MODEL_SAVE_DIR, help="Model output dir")
    return p.parse_args()


def build_callbacks(log_dir: str) -> list:
    return [
        # Save best model by validation accuracy
        keras.callbacks.ModelCheckpoint(
            filepath=os.path.join(log_dir, "best_model.keras"),
            monitor="val_accuracy", mode="max",
            save_best_only=True, verbose=1,
        ),
        # Reduce LR on plateau
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.4, patience=5,
            min_lr=1e-6, verbose=1,
        ),
        # Stop early if no improvement
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=12,
            restore_best_weights=True, verbose=1,
        ),
        # TensorBoard logs
        keras.callbacks.TensorBoard(
            log_dir=os.path.join(log_dir, "tb_logs"), histogram_freq=1,
        ),
        keras.callbacks.CSVLogger(os.path.join(log_dir, "training_log.csv")),
    ]


def plot_history(history, save_path: str):
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Accuracy
    axes[0].plot(history.history["accuracy"],     label="Train Accuracy", lw=2)
    axes[0].plot(history.history["val_accuracy"], label="Val Accuracy",   lw=2)
    axes[0].set_title("Model Accuracy", fontsize=13, fontweight="bold")
    axes[0].set_xlabel("Epoch"); axes[0].set_ylabel("Accuracy")
    axes[0].legend(); axes[0].grid(alpha=0.3)

    # Loss
    axes[1].plot(history.history["loss"],     label="Train Loss", lw=2)
    axes[1].plot(history.history["val_loss"], label="Val Loss",   lw=2)
    axes[1].set_title("Model Loss", fontsize=13, fontweight="bold")
    axes[1].set_xlabel("Epoch"); axes[1].set_ylabel("Loss")
    axes[1].legend(); axes[1].grid(alpha=0.3)

    plt.suptitle("CrackDetectionCNN — Training History", fontsize=15, fontweight="bold")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    print(f"[Train] Training plot saved: {save_path}")
    plt.close()


def main():
    args = parse_args()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir   = os.path.join(args.output, f"run_{timestamp}")
    os.makedirs(run_dir, exist_ok=True)

    print("=" * 60)
    print("  AI Crack Detection CNN — Training")
    print("=" * 60)
    print(f"  Dataset : {args.dataset}")
    print(f"  Epochs  : {args.epochs}")
    print(f"  Batch   : {args.batch}")
    print(f"  LR      : {args.lr}")
    print(f"  Output  : {run_dir}")
    print("=" * 60)

    # ── GPU check ────────────────────────────────────────────────────────────
    gpus = tf.config.list_physical_devices("GPU")
    if gpus:
        tf.config.experimental.set_memory_growth(gpus[0], True)
        print(f"[Train] GPU detected: {gpus[0].name}")
    else:
        print("[Train] No GPU — using CPU (training may be slow)")

    # ── Load data ─────────────────────────────────────────────────────────────
    print("\n[Train] Discovering dataset...")
    image_map = discover_dataset(args.dataset)
    train_ds, val_ds, test_ds, class_weights = build_tf_dataset(image_map)

    # ── Add augmentation to training set ─────────────────────────────────────
    aug_layer = get_augmentation_layer(strong=False)

    def augment(images, labels):
        images = aug_layer(images, training=True)
        images = add_gaussian_noise(images, stddev=0.015)
        return images, labels

    train_ds = train_ds.map(augment, num_parallel_calls=tf.data.AUTOTUNE)

    # ── Build model ───────────────────────────────────────────────────────────
    print("\n[Train] Building CNN model...")
    model = build_crack_cnn(num_classes=len(CLASS_NAMES), input_size=args.imgsize)
    model = compile_model(model, learning_rate=args.lr)
    model.summary()

    # ── Train ─────────────────────────────────────────────────────────────────
    print(f"\n[Train] Starting training for {args.epochs} epochs...\n")
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs,
        class_weight=class_weights,
        callbacks=build_callbacks(run_dir),
        verbose=1,
    )

    # ── Evaluate on test set ──────────────────────────────────────────────────
    print("\n[Train] Evaluating on test set...")
    test_results = model.evaluate(test_ds, verbose=1)
    metrics = dict(zip(model.metrics_names, test_results))
    print(f"\n[Train] Test Results: {metrics}")

    # ── Save final model ──────────────────────────────────────────────────────
    final_h5   = os.path.join(args.output, "crack_cnn.h5")
    final_keras = os.path.join(run_dir, "final_model.keras")
    model.save(final_h5)
    model.save(final_keras)
    print(f"\n[Train] Model saved:")
    print(f"  → {final_h5}   (for Flask API)")
    print(f"  → {final_keras} (full Keras format)")

    # ── Plot training history ─────────────────────────────────────────────────
    plot_history(history, os.path.join(run_dir, "training_history.png"))

    print("\n[Train] ✅ Training complete!")
    print(f"  Best val accuracy: {max(history.history['val_accuracy']):.4f}")


if __name__ == "__main__":
    main()
