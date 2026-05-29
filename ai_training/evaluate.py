"""
evaluate.py — Model evaluation with confusion matrix, precision, recall, F1.

Usage:
    python ai_training/evaluate.py --model ./trained_model/crack_cnn.h5 --dataset ./dataset
"""

import os
import sys
import argparse
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from sklearn.metrics import (
    classification_report, confusion_matrix,
    accuracy_score, precision_score, recall_score, f1_score,
)
import tensorflow as tf
from tensorflow import keras

sys.path.insert(0, str(Path(__file__).parent.parent))

from ai_training.data_loader import discover_dataset, build_tf_dataset, CLASS_NAMES


def parse_args():
    p = argparse.ArgumentParser(description="Evaluate Crack Detection CNN")
    p.add_argument("--model",   type=str, default="./trained_model/crack_cnn.h5")
    p.add_argument("--dataset", type=str, default="./dataset")
    p.add_argument("--output",  type=str, default="./trained_model/eval")
    return p.parse_args()


def plot_confusion_matrix(cm_array: np.ndarray, save_path: str):
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm_array, annot=True, fmt="d", cmap="Blues",
        xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES,
        linewidths=0.5, linecolor="white",
    )
    plt.title("Confusion Matrix — Crack Detection CNN", fontsize=14, fontweight="bold", pad=15)
    plt.ylabel("True Label", fontsize=12)
    plt.xlabel("Predicted Label", fontsize=12)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    print(f"[Eval] Confusion matrix saved: {save_path}")
    plt.close()


def main():
    args = parse_args()
    os.makedirs(args.output, exist_ok=True)

    print("[Eval] Loading model...")
    model = keras.models.load_model(args.model)
    print(f"[Eval] Model loaded: {args.model}")

    print("[Eval] Loading dataset...")
    image_map = discover_dataset(args.dataset)
    _, _, test_ds, _ = build_tf_dataset(image_map)

    print("[Eval] Running inference on test set...")
    y_true, y_pred = [], []

    for images, labels in test_ds:
        preds = model.predict(images, verbose=0)
        y_pred.extend(np.argmax(preds,  axis=1))
        y_true.extend(np.argmax(labels.numpy(), axis=1))

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    # ── Metrics ───────────────────────────────────────────────────────────────
    acc  = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, average="weighted", zero_division=0)
    rec  = recall_score(y_true, y_pred, average="weighted", zero_division=0)
    f1   = f1_score(y_true, y_pred, average="weighted", zero_division=0)

    print("\n" + "="*55)
    print("  EVALUATION RESULTS")
    print("="*55)
    print(f"  Accuracy  : {acc:.4f}  ({acc*100:.2f}%)")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1 Score  : {f1:.4f}")
    print("="*55)
    print("\nClassification Report:")
    print(classification_report(y_true, y_pred, target_names=CLASS_NAMES))

    # ── Confusion Matrix ──────────────────────────────────────────────────────
    cm = confusion_matrix(y_true, y_pred)
    plot_confusion_matrix(cm, os.path.join(args.output, "confusion_matrix.png"))

    # ── Save text report ──────────────────────────────────────────────────────
    report_txt = os.path.join(args.output, "eval_report.txt")
    with open(report_txt, "w") as f:
        f.write(f"Accuracy : {acc:.4f}\n")
        f.write(f"Precision: {prec:.4f}\n")
        f.write(f"Recall   : {rec:.4f}\n")
        f.write(f"F1 Score : {f1:.4f}\n\n")
        f.write(classification_report(y_true, y_pred, target_names=CLASS_NAMES))
    print(f"[Eval] Report saved: {report_txt}")
    print("\n[Eval] ✅ Evaluation complete!")


if __name__ == "__main__":
    main()
