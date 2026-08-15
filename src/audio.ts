export type SoundCue = 'alert' | 'investigation' | 'support' | 'achievement'

export type SoundPreferences = {
  muted: boolean
  master: number
  ambient: number
  signals: number
}

type AudioNodes = {
  context: AudioContext
  master: GainNode
  ambient: GainNode
  signals: GainNode
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))

export function normalizeSoundPreferences(value: unknown): SoundPreferences {
  const source = typeof value === 'object' && value !== null ? value as Partial<SoundPreferences> : {}
  return {
    muted: source.muted === true,
    master: typeof source.master === 'number' ? clamp(source.master) : 0.65,
    ambient: typeof source.ambient === 'number' ? clamp(source.ambient) : 0.55,
    signals: typeof source.signals === 'number' ? clamp(source.signals) : 0.8,
  }
}

function ramp(parameter: AudioParam, value: number, context: AudioContext) {
  parameter.cancelScheduledValues(context.currentTime)
  parameter.setTargetAtTime(value, context.currentTime, 0.035)
}

export function createSoundSystem(initialPreferences: SoundPreferences) {
  let preferences = normalizeSoundPreferences(initialPreferences)
  let nodes: AudioNodes | undefined
  let disposed = false
  const lastCueAt = new Map<SoundCue, number>()

  function applyMix() {
    if (!nodes) return
    ramp(nodes.master.gain, preferences.muted ? 0 : preferences.master, nodes.context)
    ramp(nodes.ambient.gain, preferences.ambient * 0.16, nodes.context)
    ramp(nodes.signals.gain, preferences.signals * 0.5, nodes.context)
  }

  function buildAmbient({ context, ambient }: AudioNodes) {
    const droneFilter = context.createBiquadFilter()
    droneFilter.type = 'lowpass'
    droneFilter.frequency.value = 185
    droneFilter.Q.value = 0.8
    droneFilter.connect(ambient)

    for (const [frequency, level] of [[43, 0.34], [64.5, 0.18]] as const) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = frequency === 43 ? 'sine' : 'triangle'
      oscillator.frequency.value = frequency
      gain.gain.value = level
      oscillator.connect(gain).connect(droneFilter)
      oscillator.start()
    }

    const noiseLength = context.sampleRate * 5
    const buffer = context.createBuffer(1, noiseLength, context.sampleRate)
    const data = buffer.getChannelData(0)
    let previous = 0
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1
      previous = previous * 0.985 + white * 0.015
      data[index] = previous * 2.3
    }
    const noise = context.createBufferSource()
    const noiseFilter = context.createBiquadFilter()
    const noiseGain = context.createGain()
    noise.buffer = buffer
    noise.loop = true
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 520
    noiseFilter.Q.value = 0.45
    noiseGain.gain.value = 0.12
    noise.connect(noiseFilter).connect(noiseGain).connect(ambient)
    noise.start()

    const lfo = context.createOscillator()
    const lfoGain = context.createGain()
    lfo.frequency.value = 0.075
    lfoGain.gain.value = 0.035
    lfo.connect(lfoGain).connect(noiseGain.gain)
    lfo.start()
  }

  function ensureContext() {
    if (nodes || disposed) return nodes
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return undefined
    const context = new AudioContextClass()
    const master = context.createGain()
    const ambient = context.createGain()
    const signals = context.createGain()
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -14
    compressor.knee.value = 16
    compressor.ratio.value = 5
    compressor.attack.value = 0.004
    compressor.release.value = 0.22
    ambient.connect(master)
    signals.connect(master)
    master.connect(compressor).connect(context.destination)
    nodes = { context, master, ambient, signals }
    buildAmbient(nodes)
    applyMix()
    return nodes
  }

  function tone(
    destination: AudioNode,
    context: AudioContext,
    start: number,
    frequency: number,
    duration: number,
    level: number,
    type: OscillatorType = 'sine',
    endFrequency?: number,
  ) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(level, start + Math.min(0.025, duration / 4))
    gain.gain.setValueAtTime(level, start + Math.max(0.03, duration - 0.08))
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain).connect(destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }

  function play(cue: SoundCue) {
    const audio = nodes
    if (!audio || disposed || preferences.muted || preferences.master === 0 || preferences.signals === 0) return
    const wallTime = performance.now()
    if (wallTime - (lastCueAt.get(cue) ?? 0) < 500) return
    lastCueAt.set(cue, wallTime)
    const start = audio.context.currentTime + 0.025

    if (cue === 'alert') {
      tone(audio.signals, audio.context, start, 185, 0.28, 0.38, 'sawtooth', 118)
      tone(audio.signals, audio.context, start + 0.36, 185, 0.32, 0.34, 'sawtooth', 105)
      tone(audio.signals, audio.context, start, 370, 0.12, 0.08, 'square', 290)
      return
    }
    if (cue === 'investigation') {
      tone(audio.signals, audio.context, start, 82, 1.35, 0.18, 'triangle', 55)
      tone(audio.signals, audio.context, start + 0.05, 294, 0.42, 0.2)
      tone(audio.signals, audio.context, start + 0.43, 392, 0.5, 0.18)
      tone(audio.signals, audio.context, start + 0.86, 523, 0.7, 0.15)
      return
    }
    if (cue === 'support') {
      tone(audio.signals, audio.context, start, 260, 0.22, 0.18, 'triangle', 390)
      tone(audio.signals, audio.context, start + 0.18, 390, 0.38, 0.16, 'sine', 520)
      return
    }
    tone(audio.signals, audio.context, start, 440, 0.18, 0.12)
    tone(audio.signals, audio.context, start + 0.13, 660, 0.34, 0.11)
  }

  return {
    async start() {
      const audio = ensureContext()
      if (!audio) return false
      try {
        if (audio.context.state !== 'running') await audio.context.resume()
        return audio.context.state === 'running'
      } catch {
        return false
      }
    },
    setPreferences(nextPreferences: SoundPreferences) {
      preferences = normalizeSoundPreferences(nextPreferences)
      applyMix()
    },
    play,
    async dispose() {
      disposed = true
      const context = nodes?.context
      nodes = undefined
      if (context && context.state !== 'closed') await context.close()
    },
  }
}
