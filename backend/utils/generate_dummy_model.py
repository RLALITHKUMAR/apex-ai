"""
generate_dummy_model.py — Helper script to compile and save an untrained
CNN model with the correct mathematical input/output shapes.

This lets the user boot up and test the full stack (webcam, API, database, PDF reports)
instantly without waiting to download multi-gigabyte training datasets.
"""

import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.model.crack_model import build_crack_cnn, compile_model

MODEL_SAVE_PATH = "./trained_model/crack_cnn.h5"


def generate():
    print("=" * 60)
    print("  Initializing AI Crack Detection Mock-Inference Engine")
    print("=" * 60)
    
    # Ensure directory exists
    Path(MODEL_SAVE_PATH).parent.mkdir(parents=True, exist_ok=True)

    print("[Init] Building custom 4-block CNN...")
    model = build_crack_cnn(num_classes=4, input_size=224)
    
    print("[Init] Compiling optimizer structures...")
    model = compile_model(model)
    
    print(f"[Init] Saving baseline model structure to: {MODEL_SAVE_PATH}")
    model.save(MODEL_SAVE_PATH)
    
    print("\n[SUCCESS] Baseline model structure successfully generated!")
    print("   The Flask backend can now handle real webcam/upload inference streams.")
    print("=" * 60)


if __name__ == "__main__":
    generate()
