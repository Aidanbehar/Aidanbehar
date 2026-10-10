"""Synthesised sound effects. Loops are built from whole periods / cross-faded noise so they
repeat without clicks. Output is mono 44.1 kHz WAV, converted to Ogg Vorbis with ffmpeg."""
import os
import subprocess
import wave

import numpy as np

SR = 44100


def _rng(seed):
    return np.random.default_rng(seed)


def lowpass(x, cutoff):
    # one-pole low pass (cheap, adequate for rumble shaping)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def lowpass_fast(x, cutoff, passes=2):
    # FFT brick-ish low pass with a soft knee; circular, so loops stay seamless
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** (2 * passes))
    return np.fft.irfft(X, len(x))


def bandpass_fast(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= (1 / (1 + (lo / np.maximum(f, 1)) ** 4)) * (1 / (1 + (f / hi) ** 4))
    return np.fft.irfft(X, len(x))


def normalise(x, peak=0.8):
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


def tone(freqs, seconds, amps=None):
    """Sum of sines with frequencies rounded to whole cycles over the loop (seamless)."""
    n = int(SR * seconds)
    t = np.arange(n) / SR
    out = np.zeros(n)
    amps = amps or [1.0] * len(freqs)
    for f, a in zip(freqs, amps):
        cycles = max(1, round(f * seconds))
        out += a * np.sin(2 * np.pi * cycles / seconds * t)
    return out


def periodic_noise(seconds, seed, cutoff=None, band=None):
    """Noise that loops seamlessly (generated in the frequency domain)."""
    n = int(SR * seconds)
    x = _rng(seed).normal(0, 1, n)
    if cutoff:
        x = lowpass_fast(x, cutoff)
    if band:
        x = bandpass_fast(x, *band)
    return x


def envelope(n, attack, release):
    e = np.ones(n)
    a = int(attack * SR)
    r = int(release * SR)
    if a:
        e[:a] = np.linspace(0, 1, a)
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def turbine_hum():
    s = 4.0
    x = tone([30, 60, 90, 120, 180, 240, 360], s, [0.5, 1.0, 0.5, 0.6, 0.25, 0.2, 0.08])
    x += 0.6 * periodic_noise(s, 1, band=(200, 2500))
    x *= 1 + 0.08 * tone([0.5], s)
    return normalise(x, 0.7)


def pump_hum():
    s = 3.0
    x = tone([25, 50, 100, 150, 300], s, [0.5, 1, 0.6, 0.3, 0.15])
    x += 0.9 * periodic_noise(s, 2, band=(80, 1200))
    x *= 1 + 0.1 * tone([4], s)   # vane-pass throb
    return normalise(x, 0.7)


def transformer_hum():
    s = 2.0
    x = tone([100, 200, 300, 400, 500], s, [1, 0.5, 0.3, 0.15, 0.08])
    x += 0.15 * periodic_noise(s, 3, band=(1000, 4000))
    return normalise(x, 0.6)


def ventilation():
    s = 4.0
    x = periodic_noise(s, 4, band=(150, 3000))
    x += 0.2 * tone([60, 120], s)
    return normalise(x, 0.55)


def diesel():
    s = 2.4
    n = int(SR * s)
    t = np.arange(n) / SR
    firing = 15.0  # 900 rpm, 16 cylinders, ~ firings per second / 8 bank pulses
    pulses = (0.5 + 0.5 * np.sin(2 * np.pi * round(firing * s) / s * t)) ** 6
    x = pulses * periodic_noise(s, 5, cutoff=900) * 3
    x += tone([firing, firing * 2, firing * 4], s, [0.6, 0.4, 0.2])
    x += 0.3 * periodic_noise(s, 6, band=(1000, 5000))
    return normalise(x, 0.8)


def cooling_tower():
    s = 5.0
    x = periodic_noise(s, 7, band=(300, 9000))
    x += 0.4 * periodic_noise(s, 8, cutoff=300)
    return normalise(x, 0.5)


def underground():
    s = 6.0
    x = periodic_noise(s, 9, cutoff=120)
    x += 0.1 * tone([47], s)
    return normalise(x, 0.6)


def horn():
    s = 1.6
    n = int(SR * s)
    t = np.arange(n) / SR
    f = 440
    sq = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * f * 1.26 * t))
    on = (t % 0.8) < 0.55
    x = lowpass_fast(sq, 3000) * on
    return normalise(x * envelope(n, 0.005, 0.02), 0.7)


def siren():
    s = 8.0
    n = int(SR * s)
    t = np.arange(n) / SR
    f = 400 + 350 * (0.5 - 0.5 * np.cos(2 * np.pi * t / s))
    phase = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(phase) + 0.3 * np.sin(2 * phase) + 0.15 * np.sin(3 * phase)
    return normalise(x * envelope(n, 0.3, 0.3), 0.8)


def chime():
    s = 1.0
    n = int(SR * s)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 880 * t) * np.exp(-t * 5) + 0.6 * np.sin(2 * np.pi * 660 * t) * np.exp(-np.maximum(0, t - 0.25) * 5) * (t > 0.25)
    return normalise(x, 0.6)


def geiger_click():
    n = int(SR * 0.025)
    t = np.arange(n) / SR
    x = _rng(10).normal(0, 1, n) * np.exp(-t * 600)
    x += np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 900)
    return normalise(x, 0.9)


def dosimeter_alarm():
    s = 0.5
    n = int(SR * s)
    t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * 3200 * t)) * ((t % 0.125) < 0.07)
    return normalise(lowpass_fast(x, 6000) * envelope(n, 0.002, 0.01), 0.6)


def steam_release():
    s = 3.0
    n = int(SR * s)
    x = periodic_noise(s, 11, band=(800, 12000))
    x += 0.5 * periodic_noise(s, 12, cutoff=400)
    return normalise(x * envelope(n, 0.15, 0.6), 0.85)


def rod_drop():
    s = 1.6
    n = int(SR * s)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for k in range(10):
        st = int(SR * (0.05 + k * 0.035 + 0.01 * np.sin(k)))
        m = n - st
        tt = np.arange(m) / SR
        x[st:] += _rng(20 + k).normal(0, 1, m) * np.exp(-tt * 60) * 0.5
        x[st:] += np.sin(2 * np.pi * (180 + k * 13) * tt) * np.exp(-tt * 12) * 0.4
    x += lowpass_fast(_rng(30).normal(0, 1, n), 120) * np.exp(-t * 2) * 4
    return normalise(x, 0.8)


def breaker_trip():
    s = 0.8
    n = int(SR * s)
    t = np.arange(n) / SR
    x = _rng(40).normal(0, 1, n) * np.exp(-t * 40)
    x += np.sin(2 * np.pi * 90 * t) * np.exp(-t * 8) * 0.8
    return normalise(x, 0.9)


def rumble():
    s = 4.0
    n = int(SR * s)
    t = np.arange(n) / SR
    x = lowpass_fast(_rng(50).normal(0, 1, n), 70) * (envelope(n, 0.4, 2.0))
    x += lowpass_fast(_rng(51).normal(0, 1, n), 400) * np.exp(-t * 3) * 0.3
    return normalise(x, 0.9)


SOUNDS = {
    "machine/turbine_hum": turbine_hum,
    "machine/pump_hum": pump_hum,
    "machine/transformer_hum": transformer_hum,
    "machine/ventilation": ventilation,
    "machine/diesel_engine": diesel,
    "ambient/cooling_tower": cooling_tower,
    "ambient/underground": underground,
    "alarm/horn": horn,
    "alarm/siren": siren,
    "alarm/chime": chime,
    "instrument/geiger_click": geiger_click,
    "instrument/dosimeter_alarm": dosimeter_alarm,
    "event/steam_release": steam_release,
    "event/rod_drop": rod_drop,
    "event/breaker_trip": breaker_trip,
    "event/rumble": rumble,
}


def write(out_dir, tmp_dir):
    os.makedirs(tmp_dir, exist_ok=True)
    for name, fn in SOUNDS.items():
        data = fn()
        pcm = (np.clip(data, -1, 1) * 32767).astype(np.int16)
        wav = os.path.join(tmp_dir, name.replace("/", "_") + ".wav")
        with wave.open(wav, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        ogg = os.path.join(out_dir, name + ".ogg")
        os.makedirs(os.path.dirname(ogg), exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis", "-q:a", "4", ogg], check=True)
