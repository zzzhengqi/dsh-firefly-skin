# Convert the Firefly-UI-animation portrait artwork into compact WebP textures.
# Run once before tools/build.mjs; the generated files live in assets-src/.
import io
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "..", "Firefly-UI-animation", "src", "assets")
OUT = os.path.join(ROOT, "assets-src")
os.makedirs(OUT, exist_ok=True)

JOBS = [
    # name, source, size (None keeps original), quality / lossless
    ("open", "firefly-face-open.jpg", None, dict(quality=86, method=6)),
    ("closed", "firefly-face-closed.jpg", None, dict(quality=86, method=6)),
    ("atlas", "firefly-eyes-atlas.jpg", None, dict(quality=92, method=6)),
    ("flow", "firefly-hair-flow.png", None, dict(lossless=True, method=6)),
    ("line", "firefly-face-line-draw.png", (1000, 571), dict(lossless=True, method=6)),
]

for name, filename, size, options in JOBS:
    source = os.path.join(SRC, filename)
    image = Image.open(source)
    if image.mode not in ("RGB", "RGBA", "L"):
        image = image.convert("RGBA")
    if size is not None and image.size != size:
        image = image.resize(size, Image.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, "WEBP", **options)
    payload = buffer.getvalue()
    target = os.path.join(OUT, name + ".webp")
    with open(target, "wb") as handle:
        handle.write(payload)
    print(f"{name}: {image.size} {len(payload) / 1024:.1f} KiB")
