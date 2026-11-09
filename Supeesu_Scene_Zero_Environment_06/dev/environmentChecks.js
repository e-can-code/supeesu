export function checkEnvironmentExpectations(expectations, environment) {
  if (!expectations) return [];
  return Object.entries(expectations).map(([key, expected]) => {
    const actual = key === 'eventIds' ? environment.eventTreatments.map(event => event.id) : environment[key];
    const passes = Array.isArray(expected)
      ? (key === 'eventIds' ? JSON.stringify(actual) === JSON.stringify(expected) : Number.isFinite(actual) && actual >= expected[0] && actual <= expected[1])
      : actual === expected;
    return { key, expected, actual, passes };
  });
}
