"""Validate the active calendar schema and preserve original source provenance.

Only verifies structural and source-consistency properties. It does not claim
that proposed lunar, visual, or audio systems have been implemented.
"""

import json
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_json(relative_path):
    return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))


def main():
    try:
        from jsonschema import Draft202012Validator
    except ImportError:
        print("ERROR: Python package 'jsonschema' is required for schema validation.")
        print("Install: python -m pip install jsonschema")
        return 2

    calendar = load_json('calendar/calendar.json')
    schema = load_json('schemas/calendar.schema.json')
    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(calendar), key=lambda error: list(map(str, error.absolute_path)))
    if errors:
        for error in errors:
            print(f"FAIL: {'/'.join(map(str, error.absolute_path))}: {error.message}")
        return 1
    print('PASS: calendar.json validates against calendar.schema.json')

    source_temporal = load_json('calendar/source/temporal_map.original.json')
    expected = [
        (season['name'], season['day_end'] - season['day_start'] + 1,
         season['moisture_target'], season['radiance_target'], season['biological_activity_target'])
        for season in source_temporal['eight_seasons']
    ]
    current = [
        (season['label'], season['durationDays'], season['targets']['moisture'],
         season['targets']['radiance'], season['targets']['biologicalActivity'])
        for season in calendar['ecologicalSeasons']
    ]
    assert current == expected, 'Active season design data diverged from the preserved source.'
    print('PASS: eight season names, durations, and targets match the original temporal map')

    micro = load_json('calendar/source/microseasons_first_200_days.original.json')
    assert len(micro['weekly_profiles']) == calendar['microseasonPlan']['profileCount'] == 29
    assert micro['coverage_days'] == calendar['microseasonPlan']['coverageDays'] == 200
    epoch = date.fromisoformat(calendar['epochLocalDate'])
    for index, profile in enumerate(micro['weekly_profiles']):
        assert profile['week'] == index + 1, 'Authored week sequence is not contiguous.'
        assert date.fromisoformat(profile['start_date']) == epoch + timedelta(days=index * 7)
        assert date.fromisoformat(profile['end_date']) == epoch + timedelta(days=index * 7 + 6)
    print('PASS: 29 original microseason profiles are contiguous and unchanged')
    total_authored_days = len(micro['weekly_profiles']) * 7
    if total_authored_days != micro['coverage_days']:
        print(f'OPEN DESIGN ISSUE: {total_authored_days} authored days vs {micro["coverage_days"]} declared coverage days; no automatic extension.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
