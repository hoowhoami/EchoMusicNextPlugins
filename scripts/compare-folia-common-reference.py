"""Compare actual source Canvas and native Metal covers, composited over white."""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "directory", type=Path, nargs="?", default=Path("build/folia-common-reference")
)
args = parser.parse_args()


def pixels(path):
    image = Image.open(path).convert("RGBA")
    white = Image.new("RGBA", image.size, "white")
    return np.asarray(Image.alpha_composite(white, image).convert("RGB"), dtype=float)


rows = []
for dpr in [1, 2]:
    for name in [
        "landscape-clear",
        "landscape-overlay",
        "portrait-clear",
        "portrait-overlay",
    ]:
        filename = f"{name}-dpr{dpr}.png"
        original = pixels(args.directory / filename)
        native = pixels(args.directory / "native" / filename)
        assert native.shape == original.shape, (filename, native.shape, original.shape)
        delta = np.abs(native - original)
        row = {
            "name": name,
            "dpr": dpr,
            "shape": list(native.shape),
            "mae": float(delta.mean()),
            "p95": float(np.percentile(delta, 95)),
            "maximum": float(delta.max()),
        }
        rows.append(row)
        # This authored high-contrast source image tests the real Gaussian and
        # premultiplied gradient; native/Skia rasterisation need not be identical.
        assert row["mae"] < 2 and row["p95"] <= 8 and row["maximum"] <= 16, row

(args.directory / "comparison.json").write_text(json.dumps(rows, indent=2) + "\n")
print(json.dumps(rows, indent=2))
