import { useRef, useState, useCallback, useEffect } from 'react'

export interface AudioAnalysisData {
  frequencyData: Uint8Array    // FFT magnitudes 0-255
  waveformData: Uint8Array     // Time domain 0-255
  frequencyLeft: Uint8Array    // Left channel FFT
  frequencyRight: Uint8Array   // Right channel FFT
  bass: number                 // 0-1, 20-250Hz average
  mids: number                 // 0-1, 250-4kHz average
  highs: number                // 0-1, 4kHz-20kHz average
  rms: number                  // 0-1 overall loudness
}

function makeEmptyData(fftSize = 1024): AudioAnalysisData {
  const h = fftSize / 2
  return {
    frequencyData: new Uint8Array(h),
    waveformData: new Uint8Array(fftSize),
    frequencyLeft: new Uint8Array(h),
    frequencyRight: new Uint8Array(h),
    bass: 0, mids: 0, highs: 0, rms: 0,
  }
}

export function useAudioAnalyzer(audioBuffer: AudioBuffer | null, smoothing = 0.8) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const ctxRef        = useRef<AudioContext | null>(null)
  const sourceRef     = useRef<AudioBufferSourceNode | null>(null)
  const analyserRef   = useRef<AnalyserNode | null>(null)
  const analyserLRef  = useRef<AnalyserNode | null>(null)
  const analyserRRef  = useRef<AnalyserNode | null>(null)
  const startTimeRef  = useRef(0)   // audioCtx time when play started
  const offsetRef     = useRef(0)   // how far into the audio we started
  const rafRef        = useRef(0)
  const dataRef       = useRef<AudioAnalysisData>(makeEmptyData())

  // Stable ref for playback state — readable inside RAF loop without stale closures
  const isPlayingRef = useRef(false)

  // Expose live analysis data (not state — avoids react re-renders at 60fps)
  const audioDataRef = dataRef

  useEffect(() => {
    if (audioBuffer) setDuration(audioBuffer.duration)
    return () => { stop(); ctxRef.current?.close() }
  }, [audioBuffer])

  function getCtx() {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    return ctxRef.current
  }

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    try { sourceRef.current?.stop() } catch {}
    sourceRef.current = null
    isPlayingRef.current = false
    setIsPlaying(false)
  }, [])

  const play = useCallback(() => {
    if (!audioBuffer) return
    stop()

    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()

    const FFT = 2048
    const analyser = ctx.createAnalyser()
    analyser.fftSize = FFT
    analyser.smoothingTimeConstant = smoothing
    analyserRef.current = analyser

    // Stereo split
    const splitter = ctx.createChannelSplitter(2)
    const analyserL = ctx.createAnalyser()
    const analyserR = ctx.createAnalyser()
    analyserL.fftSize = FFT
    analyserR.fftSize = FFT
    analyserL.smoothingTimeConstant = smoothing
    analyserR.smoothingTimeConstant = smoothing
    analyserLRef.current = analyserL
    analyserRRef.current = analyserR

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(analyser)
    analyser.connect(ctx.destination)

    // For stereo: connect through splitter too
    source.connect(splitter)
    splitter.connect(analyserL, 0)
    splitter.connect(analyserR, 1)

    const offset = Math.min(offsetRef.current, audioBuffer.duration)
    source.start(0, offset)
    startTimeRef.current = ctx.currentTime
    sourceRef.current = source

    source.onended = () => {
      if (sourceRef.current === source) {
        isPlayingRef.current = false
        setIsPlaying(false)
        offsetRef.current = 0
        setCurrentTime(0)
        cancelAnimationFrame(rafRef.current)
      }
    }

    isPlayingRef.current = true
    setIsPlaying(true)

    const fftBins = analyser.frequencyBinCount
    const freqBuf = new Uint8Array(fftBins)
    const waveBuf = new Uint8Array(analyser.fftSize)
    const freqBufL = new Uint8Array(fftBins)
    const freqBufR = new Uint8Array(fftBins)

    // Bin ranges for SR=48kHz, FFT=2048 → bin width ≈ 23.4 Hz
    const binHz = (ctx.sampleRate || 44100) / FFT
    const bassEnd  = Math.floor(250  / binHz)
    const midsEnd  = Math.floor(4000 / binHz)
    const highsEnd = fftBins

    function tick() {
      rafRef.current = requestAnimationFrame(tick)
      const now = ctx.currentTime - startTimeRef.current + offset
      setCurrentTime(Math.min(now, audioBuffer!.duration))

      analyser.getByteFrequencyData(freqBuf)
      analyser.getByteTimeDomainData(waveBuf)
      analyserL.getByteFrequencyData(freqBufL)
      analyserR.getByteFrequencyData(freqBufR)

      let bassSum = 0, midsSum = 0, highsSum = 0, rmsSum = 0

      for (let i = 0; i < fftBins; i++) {
        const v = freqBuf[i] / 255
        if (i < bassEnd)  bassSum  += v
        else if (i < midsEnd) midsSum += v
        else               highsSum += v
      }
      for (let i = 0; i < waveBuf.length; i++) {
        const s = (waveBuf[i] - 128) / 128
        rmsSum += s * s
      }

      dataRef.current = {
        frequencyData:  freqBuf,
        waveformData:   waveBuf,
        frequencyLeft:  freqBufL,
        frequencyRight: freqBufR,
        bass:  Math.min(1, bassSum  / bassEnd),
        mids:  Math.min(1, midsSum  / (midsEnd - bassEnd)),
        highs: Math.min(1, highsSum / (highsEnd - midsEnd)),
        rms:   Math.min(1, Math.sqrt(rmsSum / waveBuf.length) * 5),
      }
    }

    tick()
  }, [audioBuffer, smoothing])

  const pause = useCallback(() => {
    if (!ctxRef.current || !isPlaying) return
    offsetRef.current = ctxRef.current.currentTime - startTimeRef.current + offsetRef.current
    stop()
  }, [isPlaying, stop])

  const seek = useCallback((t: number) => {
    offsetRef.current = Math.max(0, Math.min(t, audioBuffer?.duration ?? 0))
    setCurrentTime(offsetRef.current)
    if (isPlaying) play()
  }, [isPlaying, play, audioBuffer])

  const toggle = useCallback(() => {
    isPlaying ? pause() : play()
  }, [isPlaying, play, pause])

  return { isPlaying, isPlayingRef, currentTime, duration, play, pause, seek, toggle, audioDataRef }
}
