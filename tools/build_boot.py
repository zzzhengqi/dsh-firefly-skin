# Regenerate src/boot.css from the Firefly-UI-animation v1.2.0 boot stylesheet.
# Usage: python tools/build_boot.py
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "..", "Firefly-UI-animation", "src", "firefly-boot.css")
DST = os.path.join(ROOT, "src", "boot.css")

text = io.open(SRC, encoding="utf-8").read()
text = text.replace("  -webkit-app-region: drag;\n", "")
# Drop the original one-line banner; the port has its own header.
lines = text.splitlines(True)
if lines and lines[0].lstrip().startswith("/* Firefly boot film"):
    lines = lines[1:]
text = "".join(lines).lstrip()

prefix = """/* Firefly boot film — full-bleed portrait that draws itself, then opens its eyes.
   Ported to the DSH web client; every rule is scoped under #ff-boot. */

/* WebGL stage (replaces the <img> layers while it is live). */
#ff-boot .ff-gl {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

#ff-boot .ffb-color.ff-gl-on > img,
#ff-boot .ffb-color.ff-gl-on > .ff-lids {
  visibility: hidden;
}

/* DOM fallback eyelids (used when WebGL2 is unavailable). */
#ff-boot .ff-lids {
  position: absolute;
  inset: 0;
  pointer-events: none;
  --ff-eye-open: 0;
  --ff-eye-drop: 0;
  opacity: 0;
}

#ff-boot .ff-lids.is-on {
  opacity: 1;
}

#ff-boot .ff-lid {
  --ff-lid-x: 60.2%;
  --ff-lid-y: calc(30.5% - 6.4% * var(--ff-eye-open) + 1.3% * var(--ff-eye-drop));
  --ff-eye-w: calc(2.2% + 4.1% * var(--ff-eye-open));
  --ff-eye-h: calc(0.1% + 6.3% * var(--ff-eye-open) + 1.3% * var(--ff-eye-drop));
  position: absolute;
  inset: 0;
  mask-image: radial-gradient(
    ellipse var(--ff-eye-w) var(--ff-eye-h) at var(--ff-lid-x) var(--ff-lid-y),
    #000 52%,
    rgba(0, 0, 0, 0.55) 76%,
    transparent 100%
  );
  -webkit-mask-image: radial-gradient(
    ellipse var(--ff-eye-w) var(--ff-eye-h) at var(--ff-lid-x) var(--ff-lid-y),
    #000 52%,
    rgba(0, 0, 0, 0.55) 76%,
    transparent 100%
  );
}

#ff-boot .ff-lid-r {
  --ff-lid-x: 83.6%;
  --ff-lid-y: calc(37.7% - 6% * var(--ff-eye-open) + 1.9% * var(--ff-eye-drop));
  --ff-eye-w: calc(2.4% + 4.2% * var(--ff-eye-open));
  --ff-eye-h: calc(0.1% + 5.9% * var(--ff-eye-open) + 1.9% * var(--ff-eye-drop));
}

#ff-boot .ff-lid span {
  position: absolute;
  inset: 0;
  background: var(--ff-face-open) center / 100% 100% no-repeat;
  filter: var(--ff-lid-filter, saturate(1.02) contrast(1.03) brightness(0.92));
  will-change: mask-image;
}

"""

brand_old = """.ffb-brand img {
  height: 20px;
  width: auto;
  opacity: 0.92;
  filter: drop-shadow(0 0 14px rgba(127, 231, 255, 0.45));
}"""

brand_new = """.ffb-brand-mark {
  width: 15px;
  height: 15px;
  position: relative;
  flex: none;
  transform: rotate(45deg);
  border: 1px solid rgba(127, 231, 255, 0.62);
  box-shadow: 0 0 18px rgba(127, 231, 255, 0.45), inset 0 0 10px rgba(127, 231, 255, 0.25);
}

.ffb-brand-mark::after {
  content: "";
  position: absolute;
  inset: 4px;
  background: #dff9ff;
  box-shadow: 0 0 12px 1px rgba(127, 231, 255, 0.9);
}

.ffb-brand-word {
  font-family: var(--ffb-mono);
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #eafaff;
  text-shadow: 0 0 18px rgba(127, 231, 255, 0.45);
  white-space: nowrap;
}"""

assert brand_old in text, "brand rule not found"
text = text.replace(brand_old, brand_new)

suffix = """

/* DSH port extras ---------------------------------------------------------- */

#ff-boot {
  -webkit-font-smoothing: antialiased;
}

#ff-boot .ffb-brand-tag b {
  font-weight: 400;
  color: var(--ffb-gold, #f6cf8e);
}

/* Reserve the Electron title-bar band so the native window controls never
   cover the right-hand HUD. */
#ff-boot .ffb-top {
  height: 108px;
  padding-top: 34px;
}

#ff-boot .ffb-frame i:nth-child(1),
#ff-boot .ffb-frame i:nth-child(2) {
  top: 122px;
}

@media (max-width: 900px) {
  #ff-boot .ffb-top-right span:nth-child(2),
  #ff-boot .ffb-status span:nth-child(3) {
    display: none;
  }
  #ff-boot .ffb-left {
    width: min(360px, 60vw);
    bottom: 92px;
  }
  #ff-boot .ffb-title h1 {
    font-size: 40px;
  }
}
"""

io.open(DST, "w", encoding="utf-8").write(prefix + text + suffix)
print("boot.css", len(prefix + text + suffix))
