/** Presentation-only descriptions of the World Clock and scenario selection. */
export function describeWorldMode(clockState) {
  if (clockState.mode === 'real') {
    return {
      id: 'live',
      label: 'LIVE · REAL TIME',
      explanation: 'World time follows the actual clock. No scenario is active.'
    };
  }
  if (clockState.mode !== 'simulated') {
    throw new RangeError(`Unknown world clock mode: ${clockState.mode}`);
  }
  if (clockState.rate === 0) {
    return {
      id: 'paused',
      label: 'PAUSED · SIMULATION',
      explanation: 'World time is frozen at the selected instant. Real time continues normally.'
    };
  }
  return {
    id: 'simulated',
    label: `SIMULATED · ${clockState.rate}×`,
    explanation: 'World time is running from a simulated reference instant. It is not the real date.'
  };
}

/** A selection is not an applied scenario until an explicit seek has occurred. */
export function describeScenarioApplication(selected, appliedScenarioId, clockState) {
  if (!selected) {
    return { id: 'none', label: 'No scenario selected', applied: false };
  }
  const targetMs = new Date(selected.worldLocalDateTime).getTime();
  const applied = Number.isFinite(targetMs) &&
    selected.id === appliedScenarioId &&
    clockState.mode === 'simulated' &&
    clockState.rate === 0 &&
    Math.abs(clockState.nowMs - targetMs) < 1000;
  return applied
    ? { id: 'applied', label: 'Scenario applied · World Clock paused', applied: true }
    : { id: 'not-applied', label: 'Scenario not applied', applied: false };
}

export function checkScenarioAssertions(assertions, observed) {
  return Object.entries(assertions ?? {}).map(([path, expected]) => {
    const actual = path.split('.').reduce((value, segment) => value?.[segment], observed);
    return {
      path,
      passes: JSON.stringify(actual) === JSON.stringify(expected),
      expected,
      actual
    };
  });
}
