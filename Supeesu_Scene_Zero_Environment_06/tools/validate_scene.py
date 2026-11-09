"""Verify versioned scene data, replaceable image assets, and original audio files."""
import json
from pathlib import Path
import wave
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SCENE = ROOT / 'scenes/living-pool'
manifest = json.loads((SCENE / 'scene.json').read_text(encoding='utf-8'))
environment = json.loads((SCENE / 'environment.json').read_text(encoding='utf-8'))
calendar = json.loads((ROOT / 'calendar/calendar.json').read_text(encoding='utf-8'))
assert manifest['schemaVersion'] == environment['schemaVersion'] == calendar['schemaVersion'] == 1
try:
    import jsonschema
except ImportError:
    print('SKIP: JSON Schema library is unavailable; manifest semantic and asset checks still run.')
else:
    for name, instance in [('scene', manifest), ('environment', environment)]:
        schema = json.loads((ROOT / 'schemas' / f'{name}.schema.json').read_text(encoding='utf-8'))
        jsonschema.validate(instance, schema)
    print('PASS: scene and environment JSON Schema')
assert len(manifest['fish']) == 3
ids = set()
for item in [*manifest['layers'], *manifest['fish']]:
    assert item['id'] not in ids, f"Repeated visual ID: {item['id']}"
    ids.add(item['id'])
    if 'asset' in item:
        media = (SCENE / item['asset']).resolve()
        assert media.is_relative_to(SCENE) and media.is_file(), f'Missing or out-of-scene asset: {media}'
        if media.suffix.lower() == '.svg':
            assert ET.parse(media).getroot().tag.endswith('svg'), str(media)
        elif media.suffix.lower() == '.png':
            assert media.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'), str(media)
        elif media.suffix.lower() == '.webp':
            data = media.read_bytes()[:12]
            assert data[:4] == b'RIFF' and data[8:] == b'WEBP', str(media)
        elif media.suffix.lower() in {'.jpg', '.jpeg'}:
            assert media.read_bytes()[:2] == b'\xff\xd8', str(media)
        else:
            raise AssertionError(f'Unsupported image format: {media}')
for name in manifest['audio'].values():
    media = (SCENE / name).resolve()
    assert media.is_relative_to(SCENE) and media.is_file(), f'Missing audio: {media}'
    if media.suffix.lower() == '.wav':
        with wave.open(str(media), 'rb') as stream:
            assert stream.getnframes() > 0 and stream.getnchannels() >= 1
    elif media.suffix.lower() in {'.mp3', '.ogg', '.opus', '.m4a', '.mp4', '.webm'}:
        assert media.stat().st_size > 128, str(media)
        print(f'INFO: {media.name} is a supported browser media format; codec playback must be checked in the target browser.')
    else:
        raise AssertionError(f'Unsupported audio format: {media}')
assert set(environment['seasonPalettes']) == {season['id'] for season in calendar['ecologicalSeasons']}
assert len(environment['timeKnots']) >= 4
print(f"PASS: {len(manifest['layers'])} composited layers, {len(manifest['fish'])} animated fish, "
      f"{len(manifest['audio'])} audio roles, and {len(environment['seasonPalettes'])} palettes")
