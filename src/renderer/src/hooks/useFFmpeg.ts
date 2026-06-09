import { useState, useEffect, useCallback } from 'react'
import type {
  Encoder,
  Format,
  ConversionState,
  Progress,
  ConversionResult
} from '../types'

const api = window.ffmpegAPI

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFFmpeg() {
  const [ffmpegVersion, setFfmpegVersion] = useState<string | null>(null)
  const [ffmpegAvailable, setFfmpegAvailable] = useState(true)
  const [ytdlpAvailable, setYtdlpAvailable] = useState(false)
  const [loading, setLoading] = useState(true)

  const [videoEncoders, setVideoEncoders] = useState<Encoder[]>([])
  const [audioEncoders, setAudioEncoders] = useState<Encoder[]>([])
  const [formats, setFormats] = useState<Format[]>([])
  const [hwAccels, setHwAccels] = useState<string[]>([])

  const [conversionState, setConversionState] = useState<ConversionState>({
    status: 'idle',
    progress: null
  })
  const [logs, setLogs] = useState<string[]>([])

  // ── Startup: load encoder/format lists ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [version, encoders, fmts, accels, ytdlp] = await Promise.all([
          api.getVersion(),
          api.getEncoders(),
          api.getFormats(),
          api.getHwAccels(),
          api.checkYtdlp()
        ])

        if (cancelled) return

        setFfmpegVersion(version)
        setFfmpegAvailable(true)
        setYtdlpAvailable(ytdlp)
        setVideoEncoders(encoders.filter((e) => e.type === 'video'))
        setAudioEncoders(encoders.filter((e) => e.type === 'audio'))
        setFormats(fmts.filter((f) => f.canMux))
        setHwAccels(accels)
      } catch {
        if (!cancelled) setFfmpegAvailable(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // ── IPC event listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const cleanupProgress = api.onProgress((progress: Progress) => {
      setConversionState((prev) => ({ ...prev, status: 'running', progress }))
    })

    const cleanupLog = api.onLog((text: string) => {
      setLogs((prev) => {
        // Keep last 2000 lines to avoid memory issues
        const next = [...prev, text]
        return next.length > 2000 ? next.slice(next.length - 2000) : next
      })
    })

    const cleanupDone = api.onDone((result: ConversionResult) => {
      if (result.success) {
        setConversionState({ status: 'done', progress: null })
      } else if (result.cancelled) {
        setConversionState({ status: 'cancelled', progress: null })
      } else {
        setConversionState({
          status: 'error',
          progress: null,
          error: result.error ?? `FFmpeg exited with code ${result.code}`
        })
      }
    })

    return () => {
      cleanupProgress()
      cleanupLog()
      cleanupDone()
    }
  }, [])

  // ── Actions ──────────────────────────────────────────────────────────────────

  const startConversion = useCallback(
    async (args: string[]) => {
      setLogs([])
      setConversionState({ status: 'running', progress: null })
      try {
        await api.start(args)
      } catch {
        // errors are handled by the onDone listener
      }
    },
    []
  )

  const cancelConversion = useCallback(async () => {
    await api.cancel()
    // Status update comes from onDone
  }, [])

  const resetConversion = useCallback(() => {
    setConversionState({ status: 'idle', progress: null })
    setLogs([])
  }, [])

  const clearLogs = useCallback(() => setLogs([]), [])

  return {
    // FFmpeg availability
    ffmpegVersion,
    ffmpegAvailable,
    ytdlpAvailable,
    loading,
    // Codec / format lists
    videoEncoders,
    audioEncoders,
    formats,
    hwAccels,
    // Conversion state
    conversionState,
    logs,
    // Actions
    startConversion,
    cancelConversion,
    resetConversion,
    clearLogs
  }
}
