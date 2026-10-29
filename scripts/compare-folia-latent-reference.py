#!/usr/bin/env python3
"""Report full RGB native/browser differences; requires Pillow and NumPy for QA only."""

import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("native", type=Path)
parser.add_argument("browser", type=Path)
args = parser.parse_args()
result = {}
for time in (0, 1, 3):
    for mode in ("both", "mesh", "dithering"):
        name = f"latent-{mode}-t{time}.png"
        native = np.asarray(
            Image.open(args.native / name).convert("RGB"), dtype=np.int16
        )
        browser = np.asarray(
            Image.open(args.browser / name).convert("RGB"), dtype=np.int16
        )
        if native.shape != browser.shape:
            raise ValueError(
                f"Full-scene size mismatch for {name}: {native.shape} vs {browser.shape}"
            )
        difference = np.abs(native - browser)
        result[name] = {
            "shape": list(native.shape),
            "meanChannelError": float(difference.mean()),
            "p95ChannelError": float(np.percentile(difference, 95)),
            "maxChannelError": int(difference.max()),
            "exactPixelFraction": float(np.all(difference == 0, axis=2).mean()),
        }
print(json.dumps(result, indent=2))
