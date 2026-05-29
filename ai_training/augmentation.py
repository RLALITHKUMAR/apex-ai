"""
augmentation.py — Image augmentation pipeline for CNN training.
"""

import tensorflow as tf
import numpy as np


def get_augmentation_layer(strong: bool = False) -> tf.keras.Sequential:
    """Build Keras augmentation Sequential model."""
    layers = [
        tf.keras.layers.RandomFlip("horizontal_and_vertical"),
        tf.keras.layers.RandomRotation(0.15),
        tf.keras.layers.RandomZoom(height_factor=(-0.1, 0.2)),
        tf.keras.layers.RandomTranslation(height_factor=0.08, width_factor=0.08),
    ]
    if strong:
        layers += [
            tf.keras.layers.RandomBrightness(factor=0.25),
            tf.keras.layers.RandomContrast(factor=0.25),
        ]
    return tf.keras.Sequential(layers, name="augmentation")


def augment_batch(images, labels, strong: bool = False):
    aug = get_augmentation_layer(strong=strong)
    return aug(images, training=True), labels


def add_gaussian_noise(image: tf.Tensor, stddev: float = 0.02) -> tf.Tensor:
    noise = tf.random.normal(shape=tf.shape(image), mean=0.0, stddev=stddev)
    return tf.clip_by_value(image + noise, 0.0, 1.0)
