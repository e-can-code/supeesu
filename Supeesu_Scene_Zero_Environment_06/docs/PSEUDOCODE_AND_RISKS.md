# Scene Zero — Risk-oriented pseudocode and checks

## Architecture

The real wall clock, seekable world clock and session-day clock must not be conflated. The universal calendar produces facts; scene-specific environment profiles interpret them; rendering and sound apply the resulting plans independently. All stateful side effects are constrained to the production coordinator and audio subsystem.

## A. Resolve environmental state at any world instant

```text
resolve(worldInstant, calendarSnapshot, sceneEnvironmentProfile):
    assert calendarSnapshot describes the same worldInstant
    localMinute = civil time-of-day from worldInstant
    dailyFactors = interpolate neighboring scene time knots smoothly
    season = calendarSnapshot.ecology.seasonId
    seasonalTargets = calendarSnapshot.ecology.seasonTargets
    rhythms = calendarSnapshot.rhythms

    baseIllumination = dailyFactors.illumination * seasonalRadianceScale
    fishActivity = dailyFactors.fishActivity * seasonalBiologicalScale
    mist = dailyFactors.mist * seasonalMoistureScale + 200DayWave
    waterHighlights = dailyFactors.highlights * seasonalRadianceScale + 400DayWave
    palette = sceneEnvironmentProfile.seasonPalettes[season]
    modify accent by bounded seven-day wave

    for event in sorted(calendarSnapshot.annualEvents):
        if sceneEnvironmentProfile has an explicit treatment for event:
            blend event palette according to bounded authored strength
            record treatment ID and strength

    clamp numbers to declared ranges
    return new environment snapshot and provenance
```

**Test:** Input order does not matter. Jumping months forward/back reconstructs the same result. Each independent calendar rhythm has an explicit contribution. Annual convergence overlays the existing season rather than replacing it.

## B. Deterministic fish and splash events

```text
fishPose(fishDefinition, worldInstant):
    phase = worldSeconds / fishPeriod + fishPhaseOffset
    return orbitPosition(phase), orientationFromOrbitDerivative(phase)

scheduledSplashes(localCivilDate, splashDefinition):
    for each fixed local 4-minute bucket:
        probability = baselineChance * smoothEveningMultiplier(bucketTime)
        seed = hash(sceneId, localCivilDate, bucketIndex, behaviorSeed)
        if seededUniform(seed, "occurrence") < probability:
            timestamp = bucketStart + seededOffset
            location = seededWaterPoint
            yield stable event ID, timestamp, location

onVisualTick(nowWorldTime):
    draw only ripples whose event window contains nowWorldTime
    if clock jumped or tick gap is too long:
        never trigger a backlog of past splash sounds
```

**Test:** At 20:00 the event probability multiplier is 1.5 exactly. Replaying a date produces identical event IDs. Seeking does not cause delayed audio bursts. Manual click ripples use real display time even when the World Clock is paused.

## C. First open of the 05:30 session day

```text
onProductionSceneLoad():
    realSession = sessionForInstant(realClock.nowMs())
    ledger = safelyReadProductionLedger()
    if ledger.lastSuccessfulSession == realSession.id:
        do not auto-start this day's audio again
    else:
        try to acquire exclusive Web Lock
        attempt playback (browser may deny autoplay)
        if playback actually begins and media is not paused:
            write realSession.id to ledger
        else:
            leave ledger unchanged; show quiet first-click prompt

onLaboratorySeek(worldInstant):
    recompute only simulated calendar, environment and visual events
    never call production ledger write or automatic playback
```

**Test:** 05:29 belongs to previous session day; 05:30 changes ID. Failure does not write a false success. Two tabs cannot own the soundscape simultaneously when Web Locks works.

## D. Separate visual and audio lifecycle

```text
state = visibilityPolicy(tabHidden, persistentAudioPreference, soundActive)

if state.animateVisuals: resume animation callbacks
else: cancel animation callbacks

if state.audioAction == "pause": pause all playing channels
if state.audioAction == "resume": resume previously active channels
if state.audioAction == "keep": keep active audio unchanged
```

**Test:** Hidden + persistence on = visuals off, sound available. Hidden + persistence off = visuals off, sound paused. Focus loss on a still-visible second monitor does not suspend visuals. Tab closure stops sound and releases ownership.

## E. Artistic constraint for overlapping special events

The environment resolver may expose multiple independent influences, but exceptional calendar moments must use explicitly authored, bounded compositions. No unbounded stack of golden, pink and lunar overlays is allowed. The future Workshop should preview each yearly January 29 combination and require visual review before approval.

## Open risk notes

Browser autoplay, actual cross-tab Web Lock behavior, SVG asset loading, Firefox painting, and hidden-tab event scheduling require manual target-environment verification. Microseason source count remains 203 authored versus 200 declared. Real moon ephemeris and complete composition approval remain unimplemented.

## Environment 03 — World Orrery and background audio

```text
On ring pointer-down:
    record WorldClock.nowMs() and pointer angle
On pointer movement:
    unwrap each incremental angle difference across +/-pi
    accumulate signed rotation
    seek WorldClock to startInstant + rotation * ringSpan / 2pi
    pause WorldClock; reset seeded ripple scheduler
    invalidate environment cache (also for backward movement)
On LIVE:
    WorldClock.useRealTime()
On FLOW:
    WorldClock.setRate(1) without jumping to actual time

On ambient audio start:
    acquire exclusive Web Lock
    construct a single AudioContext
    attempt resume with timeout (autoplay may block)
    decode short original ambience/music buffers
    start looping ambient channel, optionally music
    report active only if AudioContext is running
On visibility hidden:
    suspend *visual RAF* independently
    if persistence is enabled, leave the AudioContext untouched
    otherwise suspend AudioContext
On visibility visible:
    resume visual RAF
    resume AudioContext if it was suspended
On stop/page unload:
    stop sources; close context; release ownership lock
```

The Web Audio subsystem can fail on the target browser even with passing unit tests. A timed resume attempt is not a way around browser autoplay policy; the user gesture remains the authoritative fallback. Long-form authored tracks will need a streaming media-to-mixer design rather than decoding entire hours into AudioBuffer memory.

## Environment 04 design amendments — accelerated FLOW, diagnostics and audio

```text
onFlowPressed():
    rate = validatedSelection(default=3600)
    worldClock.setRate(rate)
    invalidate environment frame
    clear accelerated-event cursor

onVisualFrame():
    worldMs = worldClock.nowMs()
    actualMs = realClock.nowMs()
    state = calendar.describe(worldMs)
    environment = resolver.resolve(worldMs,state)
    renderer.applyEnvironment(environment)
    renderer.animateFish(actualMs,environment.fishActivity)
    if rate > 1 and previousWorldFrame is valid:
        event = findFirstDeterministicSplashCrossed(previousWorldFrame,worldMs)
        if event and realRippleCooldownElapsed:
            render short real-time ripple
            if realSoundCooldownElapsed and soundscape already running:
                play one splash at most
    // Never catch up hundreds of old audio events after manual seeks.

onAudioButtonClick():
    createAudioContextIfAbsent()
    requestAudioContextResumeImmediatelyInClickStack()
    asynchronouslyAcquireExclusiveTabAudioLock()
    await boundedResumeResult()
    decodeNormalizedShortSamples()
    launchIndependentChannels()
    show actual context, lock, signal and error states

onTestChimeClick():
    openOrResumeMixerInCurrentGesture()
    playShortSineEnvelopeIfRunning()
    never write dailyPlaybackLedger
```

**Risk notes:** Simulated World Clock times and live fish animation times intentionally differ (ADR-0011). Actual environmental history stays deterministic, while real-world moving fish positions are not guaranteed on repeated historical seeks. The temporary diagnostic lunar phase and fictional weather APIs must remain labeled and replaceable (ADR-0012). Browser sound-state introspection proves neither physical sound output nor background-page policy in a different browser.


## Environment 05: automatic audio boundary and blocked autoplay

```text
on page open or real timer wake/focus/page-visibility change:
    session = sessionClock(realClock.now())
    if ledger already records session:
        report already-started; schedule next real check
    else if audio engine already owns active playback:
        record session success WITHOUT restarting playback
    else if tab is hidden and user chose nonpersistent audio:
        defer until visible
    else if this session has not been attempted:
        attempt automatic playback through audio lock
        if audio engine confirms actual active playback:
            record success against the current real session
        else:
            leave pending, do not write ledger or retry indefinitely
    schedule next check (up to 30 seconds or the session boundary)

on user-initiated audio playback:
    prime the AudioContext inside click handler
    acquire lock and launch the recording
    if confirmed active, record this real session success

on World Clock seek:
    recompute visual environment ONLY
    never call automatic audio supervision or history writer
```

## Environment 05: ring-drag safety

```text
on pointerdown on ring:
    cancel any previous drag
    attach window-level pointermove/up/cancel listeners
    remember initial instant, pointer and angular position
on pointermove with matching pointer:
    accumulate unwrapped angle delta
    seek/pause World Clock; render visual state
on pointerup, cancel, or window blur:
    remove all temporary pointer listeners
    release capture if still held
    restore stable FLOW and speed controls
```
