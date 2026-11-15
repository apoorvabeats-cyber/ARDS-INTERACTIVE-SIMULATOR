import subprocess
from pathlib import Path

import cairosvg
import imageio_ffmpeg
import numpy as np


WIDTH, HEIGHT, FPS, DURATION = 1080, 1920, 30, 8
FRAME_DIR = Path("/tmp/critical-care-logo-frames")
SCORE = Path("/tmp/critical-care-theme.mp3")
FRAME_DIR.mkdir(parents=True, exist_ok=True)


RING_LEN = 2 * 3.141592653589793 * 105


def clamp(value):
    return max(0.0, min(1.0, value))


def ease_out(value):
    value = clamp(value)
    return 1 - (1 - value) ** 3


def audio_energy():
    sample_rate = 12000
    process = subprocess.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(),
            "-v", "error", "-i", str(SCORE), "-t", str(DURATION),
            "-f", "f32le", "-ac", "1", "-ar", str(sample_rate), "pipe:1",
        ],
        check=True,
        capture_output=True,
    )
    samples = np.frombuffer(process.stdout, dtype=np.float32)
    window = max(1, int(sample_rate * 0.06))
    energies = []
    for frame in range(FPS * DURATION):
        start = int(frame / FPS * sample_rate)
        chunk = samples[start : start + window]
        energies.append(float(np.sqrt(np.mean(chunk * chunk))) if len(chunk) else 0.0)
    peak = max(energies, default=0.0) or 1.0
    return [min(1.0, value / peak) for value in energies]


def opacity_after(time, start, duration=0.45):
    return ease_out((time - start) / duration)


def scene_svg(time, energy):
    left = opacity_after(time, 0.55)
    right = opacity_after(time, 1.55)
    u = opacity_after(time, 2.55, 0.55)
    circle = clamp((time - 3.15) / 1.15)
    critical = opacity_after(time, 4.53, 0.24)
    care = opacity_after(time, 5.54, 0.24)
    universe = opacity_after(time, 6.56, 0.24)
    ring_off = RING_LEN * (1 - circle)
    ring_done = clamp((circle - 0.9) / 0.1)
    energy_glow = 0.12 + energy * 0.24
    scale = 2.5 - 1.5 * u
    left_shift = -52 * (1 - left)
    right_shift = 52 * (1 - right)

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 540 960">
  <defs>
    <radialGradient id="background" cx="50%" cy="47%" r="74%">
      <stop offset="0" stop-color="#0b1730"/>
      <stop offset=".48" stop-color="#060d1b"/>
      <stop offset="1" stop-color="#030509"/>
    </radialGradient>
    <radialGradient id="aura" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#1265bd" stop-opacity=".18"/>
      <stop offset=".55" stop-color="#0a4489" stop-opacity=".07"/>
      <stop offset="1" stop-color="#04101f" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="flarePoint">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset=".12" stop-color="#d9fbff"/>
      <stop offset=".36" stop-color="#1fb9ff" stop-opacity=".72"/>
      <stop offset="1" stop-color="#087aff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="titanium" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#708295"/>
      <stop offset=".17" stop-color="#f4fbff"/>
      <stop offset=".35" stop-color="#a9bac8"/>
      <stop offset=".51" stop-color="#ffffff"/>
      <stop offset=".68" stop-color="#8b9eaf"/>
      <stop offset=".84" stop-color="#f8fcff"/>
      <stop offset="1" stop-color="#7e8d9d"/>
    </linearGradient>
    <linearGradient id="cobalt" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2ceaff"/>
      <stop offset=".18" stop-color="#13baff"/>
      <stop offset=".43" stop-color="#0872ff"/>
      <stop offset=".68" stop-color="#19c7ff"/>
      <stop offset=".86" stop-color="#087aff"/>
      <stop offset="1" stop-color="#1261d6"/>
    </linearGradient>
    <linearGradient id="wordSilver" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset=".38" stop-color="#c5d0da"/>
      <stop offset=".7" stop-color="#f5f8fa"/>
      <stop offset="1" stop-color="#8998a7"/>
    </linearGradient>
    <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="5.5"/>
    </filter>
    <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4.3"/>
    </filter>
    <filter id="ringHalo" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
    <linearGradient id="flare" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="540" y2="0">
      <stop offset="0" stop-color="#007bff" stop-opacity="0"/>
      <stop offset=".28" stop-color="#158cff" stop-opacity=".25"/>
      <stop offset=".46" stop-color="#4dcfff" stop-opacity=".9"/>
      <stop offset=".5" stop-color="#ffffff"/>
      <stop offset=".54" stop-color="#4dcfff" stop-opacity=".9"/>
      <stop offset=".72" stop-color="#158cff" stop-opacity=".25"/>
      <stop offset="1" stop-color="#007bff" stop-opacity="0"/>
    </linearGradient>
    <filter id="flareGlow" x="-20%" y="-500%" width="140%" height="1100%">
      <feGaussianBlur stdDeviation="2.4"/>
    </filter>
  </defs>
  <rect width="540" height="960" fill="url(#background)"/>
  <ellipse cx="270" cy="316" rx="225" ry="250" fill="url(#aura)"/>
  <g font-family="Liberation Sans, Arial, sans-serif" text-anchor="middle" font-weight="600">
    <text x="195" y="82" font-size="40" letter-spacing="3.4" fill="url(#wordSilver)"
      opacity="{critical:.3f}" transform="translate(0 {8 * (1-critical):.2f})">CRITICAL</text>
    <text x="385" y="82" font-size="40" letter-spacing="3.4" fill="url(#wordSilver)"
      opacity="{care:.3f}" transform="translate(0 {8 * (1-care):.2f})">CARE</text>
    <text x="270" y="570" font-size="54" letter-spacing="8" fill="url(#wordSilver)"
      opacity="{universe:.3f}" transform="translate(0 {8 * (1-universe):.2f})">UNIVERSE</text>
  </g>
  <g opacity="{critical:.3f}">
    <path d="M35 104 H505" stroke="url(#flare)" stroke-width="1.5" filter="url(#flareGlow)"/>
    <path d="M35 104 H505" stroke="url(#flare)" stroke-width=".8"/>
    <ellipse cx="270" cy="104" rx="4.5" ry="1.2" fill="#ffffff" filter="url(#flareGlow)"/>
    <circle cx="270" cy="104" r="2" fill="#ffffff"/>
  </g>
  <g transform="translate(72 118) scale(1.65)">
    <g fill="none" stroke-linecap="butt" stroke-linejoin="round">
      <path d="M120 15 A105 105 0 1 0 120 225 A105 105 0 1 0 120 15"
        opacity="{ring_done * (0.5 + energy * 0.35):.3f}" stroke="#1d8dff" stroke-width="15"
        filter="url(#ringHalo)"/>
      <path d="M120 15 A105 105 0 1 0 120 225 A105 105 0 1 0 120 15"
        opacity="{ring_done * 0.9:.3f}" stroke="#63dcff" stroke-width="5.5"
        filter="url(#ringGlow)"/>
      <g opacity="{0.35 + 0.65 * ring_done:.3f}">
        <path d="M120 15 A105 105 0 1 0 120 225 A105 105 0 1 0 120 15"
          stroke="#138bff" stroke-width="10" filter="url(#ringGlow)"
          stroke-dasharray="{RING_LEN:.2f} {RING_LEN:.2f}" stroke-dashoffset="{ring_off:.2f}"/>
      </g>
    </g>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M120 15 A105 105 0 1 0 120 225 A105 105 0 1 0 120 15"
        transform="translate(1 2)" stroke="#06142a" stroke-width="7"
        stroke-dasharray="{RING_LEN:.2f} {RING_LEN:.2f}" stroke-dashoffset="{ring_off:.2f}"/>
      <path d="M120 15 A105 105 0 1 0 120 225 A105 105 0 1 0 120 15"
        stroke="url(#titanium)" stroke-width="4.7"
        stroke-dasharray="{RING_LEN:.2f} {RING_LEN:.2f}" stroke-dashoffset="{ring_off:.2f}"/>
      <path d="M120 15 A105 105 0 1 0 120 225 A105 105 0 1 0 120 15"
        stroke="#f4fbff" stroke-opacity=".72" stroke-width="1.1"
        stroke-dasharray="{RING_LEN:.2f} {RING_LEN:.2f}" stroke-dashoffset="{ring_off:.2f}"/>
    </g>
    <g transform="translate(0 -10)">
      <g transform="translate(120 120) scale({scale:.4f}) translate(-120 -120)"
         fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="{u:.3f}">
        <path d="M57 69 V129 C57 170 82 192 120 192 C158 192 183 170 183 129 V69"
          transform="translate(0 3)" stroke="#071a3a" stroke-width="18"/>
        <path d="M57 69 V129 C57 170 82 192 120 192 C158 192 183 170 183 129 V69"
          stroke="#168aff" stroke-opacity="{energy_glow:.3f}" stroke-width="22"
          filter="url(#softGlow)"/>
        <path d="M57 69 V129 C57 170 82 192 120 192 C158 192 183 170 183 129 V69"
          stroke="url(#cobalt)" stroke-width="10"/>
        <path d="M59 70 V129 C59 168 84 190 120 190 C156 190 181 168 181 129 V70"
          stroke="#9befff" stroke-opacity=".64" stroke-width="1.35"/>
      </g>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <g transform="translate({left_shift:.2f} 0)" opacity="{left:.3f}">
          <path d="M108 87 A32 32 0 1 0 108 153" transform="translate(0 2)"
            stroke="#334655" stroke-width="14"/>
          <path d="M108 87 A32 32 0 1 0 108 153" stroke="url(#titanium)" stroke-width="9"/>
          <path d="M106 88 A30 30 0 1 0 106 152" stroke="#ffffff" stroke-opacity=".64" stroke-width="1.15"/>
        </g>
        <g transform="translate({right_shift:.2f} 0)" opacity="{right:.3f}">
          <path d="M132 87 A32 32 0 1 1 132 153" transform="translate(0 2)"
            stroke="#334655" stroke-width="14"/>
          <path d="M132 87 A32 32 0 1 1 132 153" stroke="url(#titanium)" stroke-width="9"/>
          <path d="M134 88 A30 30 0 1 1 134 152" stroke="#ffffff" stroke-opacity=".64" stroke-width="1.15"/>
        </g>
      </g>
    </g>
  </g>
  <g opacity="{circle:.3f}">
    <path d="M25 506 H515" stroke="url(#flare)" stroke-width="1.8" filter="url(#flareGlow)"/>
    <path d="M25 506 H515" stroke="url(#flare)" stroke-width=".7"/>
  </g>
  <g opacity="{universe:.3f}">
    <path d="M35 592 H505" stroke="url(#flare)" stroke-width="1.6" filter="url(#flareGlow)"/>
    <path d="M35 592 H505" stroke="url(#flare)" stroke-width=".75"/>
    <ellipse cx="270" cy="592" rx="4.5" ry="1.2" fill="#ffffff" filter="url(#flareGlow)"/>
    <circle cx="270" cy="592" r="2" fill="#ffffff"/>
  </g>
</svg>"""


def main():
    energies = audio_energy()
    for frame in range(FPS * DURATION):
        time = frame / FPS
        svg = scene_svg(time, energies[frame])
        target = FRAME_DIR / f"frame-{frame:04d}.png"
        cairosvg.svg2png(bytestring=svg.encode(), write_to=str(target))
        if frame % 60 == 0:
            print(f"Rendered {frame}/{FPS * DURATION} frames")
    print(f"Frames ready in {FRAME_DIR}")
    icon_svg = """<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 240 240">
  <rect width="240" height="240" fill="#050b16"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M120 15 A105 105 0 1 0 120 225 A105 105 0 1 0 120 15"
      stroke="#f4f8fc" stroke-width="5.5"/>
    <g transform="translate(0 -10)">
      <path d="M57 69 V129 C57 170 82 192 120 192 C158 192 183 170 183 129 V69"
        stroke="#167dff" stroke-width="12"/>
      <path d="M108 87 A32 32 0 1 0 108 153"
        stroke="#ffffff" stroke-width="10"/>
      <path d="M132 87 A32 32 0 1 1 132 153"
        stroke="#ffffff" stroke-width="10"/>
    </g>
  </g>
</svg>"""
    cairosvg.svg2png(
        bytestring=icon_svg.encode(),
        write_to="/tmp/critical-care-universe-app-icon.png",
    )
    print("Flat app icon ready at /tmp/critical-care-universe-app-icon.png")


if __name__ == "__main__":
    main()
