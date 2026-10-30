#!/usr/bin/env python3
"""Report actual browser/native shadow and backdrop RGB, including edge differences.

This is a QA report, not a tolerance-based declaration of complete visual parity.
Pillow/NumPy are verification dependencies only.
"""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("kind", choices=["frame", "backdrop"])
parser.add_argument("--directory", type=Path)
args = parser.parse_args()
directory = args.directory or Path(
    f"build/folia-{'monet-frame' if args.kind == 'frame' else 'backdrop'}-reference"
)
metadata = json.loads((directory / "capture.json").read_text())
rows = []
for capture in metadata["captures"]:
    name, dpr = capture["name"], capture["dpr"]
    filename = f"{name}-dpr{dpr}.png"
    browser = np.asarray(Image.open(directory / filename).convert("RGB"), dtype=float)
    native = np.asarray(
        Image.open(directory / "native" / filename).convert("RGB"), dtype=float
    )
    if browser.shape != native.shape:
        raise ValueError(
            f"{filename}: different dimensions {browser.shape} / {native.shape}"
        )
    yy, xx = np.indices(browser.shape[:2], dtype=float)
    x, y = (xx + 0.5) / dpr, (yy + 0.5) / dpr
    if args.kind == "frame":
        square = name.startswith("square")
        left, top, width, height, radius = (
            (240, 180, 320, 320, 32) if square else (252, 160, 296, 400, 34.4)
        )
    else:
        left, top, width, height, radius = 200, 140, 240, 160, 24
        angle = -np.deg2rad(capture["rotation"])
        a, b = x - left - width / 2, y - top - height / 2
        x = (
            (a * np.cos(angle) - b * np.sin(angle)) / capture["scale"]
            + left
            + width / 2
        )
        y = (
            (a * np.sin(angle) + b * np.cos(angle)) / capture["scale"]
            + top
            + height / 2
        )
    qx, qy = (
        np.abs(x - left - width / 2) - width / 2 + radius,
        np.abs(y - top - height / 2) - height / 2 + radius,
    )
    distance = (
        np.hypot(np.maximum(qx, 0), np.maximum(qy, 0))
        + np.minimum(np.maximum(qx, qy), 0)
        - radius
    )
    delta = np.abs(native - browser)

    def stats(mask):
        values = delta[mask]
        return {
            "pixels": int(mask.sum()),
            "meanChannelError": float(values.mean()),
            "p99ChannelError": float(np.percentile(values, 99)),
            "maximumChannelError": int(values.max()),
            "pixelsAbove3": int(np.any(values > 3, axis=1).sum()),
        }

    peak = np.unravel_index(delta.argmax(), delta.shape)
    row = {
        "name": name,
        "dpr": dpr,
        "shape": list(native.shape),
        "full": stats(np.ones(distance.shape, dtype=bool)),
        "interior": stats(distance < -2 / dpr),
        "edgeBand": stats(np.abs(distance) <= 2 / dpr),
        "exterior": stats(distance > 2 / dpr),
        "maximumAtPhysicalPixel": [int(peak[1]), int(peak[0]), int(peak[2])],
    }
    if args.kind == "frame":
        background = np.array(
            [20, 40, 60] if name.endswith("dark") else [255, 255, 255]
        )
        mask = distance > 2 / dpr
        original_mass = float(np.abs(browser[mask] - background).sum())
        native_mass = float(np.abs(native[mask] - background).sum())
        row["exteriorShadowChannelMass"] = {
            "browser": original_mass,
            "native": native_mass,
            "relativeDifference": (
                (native_mass - original_mass) / original_mass if original_mass else None
            ),
        }
    rows.append(row)
result = {
    "kind": args.kind,
    "browser": metadata["browser"],
    "sourceSha256": metadata["sourceSha256"],
    "note": "All pixels are reported; edge classification does not discard differences or change acceptance criteria.",
    "rows": rows,
}
(directory / "comparison.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
