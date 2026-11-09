export class MicroseasonCatalog {
  constructor(source) {
    if (!Array.isArray(source?.weekly_profiles) || source.weekly_profiles.length !== 29) {
      throw new Error('Expected the preserved 29 source microseason profiles.');
    }
    this.profiles = new Map();
    for (const profile of source.weekly_profiles) {
      if (!/^microseason_\d{2}$/.test(profile.id) || !Array.isArray(profile.daily_weights) ||
        profile.daily_weights.length !== 7 || this.profiles.has(profile.id)) {
        throw new Error(`Invalid or duplicate authored microseason ${profile.id}`);
      }
      this.profiles.set(profile.id, profile);
    }
  }

  describe(calendarSnapshot) {
    const id = calendarSnapshot.rhythms.authoredMicroseasonId;
    if (!id) return null;
    const source = this.profiles.get(id);
    if (!source) throw new Error(`Referenced microseason profile not found: ${id}`);
    const day = calendarSnapshot.rhythms.microseasonDay;
    return {
      id, title: source.title, signature: source.signature,
      dailyWeight: source.daily_weights[day - 1],
      dayAction: source.daily_stage_actions?.[day - 1] ?? null,
      assetBindings: [...(source.asset_bindings ?? [])],
      status: 'authored-design-not-final-art',
    };
  }
}
