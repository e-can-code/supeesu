"""Generate original synthesized placeholder pond audio without external dependencies."""
from pathlib import Path
import math
import random
import struct
import wave

BASE = Path(__file__).resolve().parents[1] / 'scenes/living-pool/audio'
RATE = 22050


def save(name, samples):
    target = BASE / name
    with wave.open(str(target), 'wb') as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(RATE)
        stream.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, value)) * 32767)) for value in samples))
    print(name, target.stat().st_size)


def pond():
    rng = random.Random(1568)
    n = RATE * 8
    noise = [rng.random() * 2 - 1 for _ in range(n)]
    smooth = 0.0
    result = []
    for i in range(n):
        smooth = .981 * smooth + .019 * noise[i]
        t = i / RATE
        wavelet = math.sin(2 * math.pi * 0.375 * t) * .05
        result.append(.37 * smooth + wavelet)
    # Crossfade head and tail so this bed loops without a jump.
    cross = RATE // 2
    for i in range(cross):
        w = i / cross
        result[-cross + i] = (1 - w) * result[-cross + i] + w * result[i]
    save('pond-water.wav', result)


def motif():
    notes = [(196, 0), (246.94, 2), (220, 4), (164.81, 6)]
    length = RATE * 8
    data = [0.0] * length
    for frequency, start in notes:
        begin = int(start * RATE)
        duration = RATE * 2
        for i in range(duration):
            t = i / RATE
            attack = min(1, t * 10)
            release = min(1, (2 - t) * 2.6)
            value = math.sin(2 * math.pi * frequency * t) * .18 + math.sin(2 * math.pi * frequency * 2 * t) * .036
            data[begin + i] += value * attack * release
    save('pond-motif.wav', data)


def splash():
    rng = random.Random(404)
    duration = int(RATE * .85)
    data = []
    last = 0
    for i in range(duration):
        t = i / RATE
        last = last * .78 + (rng.random() * 2 - 1) * .22
        envelope = (1 - math.exp(-t * 190)) * math.exp(-t * 8.7)
        data.append((last * .55 + math.sin(2 * math.pi * (460 - t * 360) * t) * .25) * envelope)
    save('splash.wav', data)


if __name__ == '__main__':
    BASE.mkdir(parents=True, exist_ok=True)
    pond()
    motif()
    splash()
