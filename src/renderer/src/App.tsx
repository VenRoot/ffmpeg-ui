import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Clapperboard,
  AlertTriangle,
  Loader2,
  ChevronDown,
  TerminalSquare,
  ClipboardCopy,
  Sparkles
} from 'lucide-react'
import type { AppSettings, TabId, FFprobeOutput, Preset, YtdlpInfo } from './types'
import { useFFmpeg } from './hooks/useFFmpeg'
import FileSection from './components/FileSection'
import VideoSection from './components/VideoSection'
import AudioSection from './components/AudioSection'
import TrimSection from './components/TrimSection'
import AdvancedSection from './components/AdvancedSection'
import ProgressSection from './components/ProgressSection'
import LogViewer from './components/LogViewer'
import MediaInfoPanel from './components/MediaInfoPanel'

const api = window.ffmpegAPI
const YTDLP_URL_PATTERN = /youtube|youtu\.be|twitch|tiktok|instagram|twitter|x\.com|vimeo|dailymotion|reddit/i

// ─── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: Preset[] = [
  {
    id: 'web-h264',
    label: 'Web H.264',
    description: 'H.264 + AAC in MP4, compatible everywhere',
    settings: { videoCodec: 'libx264', videoUseCRF: true, videoCRF: 23, videoPreset: 'medium', pixFmt: 'yuv420p', audioCodec: 'aac', audioBitrate: '192k', outputFormat: 'mp4', videoEnabled: true, audioEnabled: true }
  },
  {
    id: 'hevc-hq',
    label: 'HEVC High Quality',
    description: 'H.265 + AAC in MKV, ~50% smaller than H.264',
    settings: { videoCodec: 'libx265', videoUseCRF: true, videoCRF: 20, videoPreset: 'slow', pixFmt: 'yuv420p10le', audioCodec: 'aac', audioBitrate: '192k', outputFormat: 'mkv', videoEnabled: true, audioEnabled: true }
  },
  {
    id: 'av1',
    label: 'AV1 (libaom)',
    description: 'Next-gen open codec, excellent quality/size',
    settings: { videoCodec: 'libaom-av1', videoUseCRF: true, videoCRF: 30, videoPreset: '', pixFmt: 'yuv420p', audioCodec: 'libopus', audioBitrate: '128k', outputFormat: 'webm', videoEnabled: true, audioEnabled: true }
  },
  {
    id: 'vp9-webm',
    label: 'VP9 + Opus',
    description: 'Open VP9 video with Opus audio in WebM',
    settings: { videoCodec: 'libvpx-vp9', videoUseCRF: true, videoCRF: 33, videoPreset: '', pixFmt: 'yuv420p', audioCodec: 'libopus', audioBitrate: '128k', outputFormat: 'webm', videoEnabled: true, audioEnabled: true }
  },
  {
    id: 'remux',
    label: 'Remux (Copy)',
    description: 'Change container without re-encoding (fast)',
    settings: { videoCodec: 'copy', audioCodec: 'copy', videoEnabled: true, audioEnabled: true }
  },
  {
    id: 'audio-aac',
    label: 'Extract AAC',
    description: 'Strip video, output AAC audio',
    settings: { videoEnabled: false, audioCodec: 'aac', audioBitrate: '192k', outputFormat: 'aac', audioEnabled: true }
  },
  {
    id: 'audio-mp3',
    label: 'Extract MP3',
    description: 'Strip video, output MP3 320k',
    settings: { videoEnabled: false, audioCodec: 'libmp3lame', audioBitrate: '320k', outputFormat: 'mp3', audioEnabled: true }
  },
  {
    id: 'audio-flac',
    label: 'Lossless FLAC',
    description: 'Extract audio as lossless FLAC',
    settings: { videoEnabled: false, audioCodec: 'flac', outputFormat: 'flac', audioEnabled: true }
  },
  {
    id: 'gif',
    label: 'Animated GIF',
    description: '640px GIF at 15 fps',
    settings: { videoCodec: 'gif', videoUseCRF: false, videoBitrate: '', videoPreset: '', pixFmt: 'rgb8', audioEnabled: false, outputFormat: 'gif', resolution: '640x-2', frameRate: '15', videoEnabled: true }
  }
]

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  inputFile: '',
  outputFile: '',
  outputFormat: 'mp4',
  videoEnabled: true,
  videoCodec: 'libx264',
  videoBitrate: '2M',
  videoUseCRF: true,
  videoCRF: 23,
  videoPreset: 'medium',
  resolution: 'original',
  customWidth: '',
  customHeight: '',
  frameRate: 'original',
  customFrameRate: '',
  pixFmt: 'yuv420p',
  audioEnabled: true,
  audioCodec: 'aac',
  audioBitrate: '192k',
  sampleRate: 'original',
  channels: 'original',
  audioVolume: 100,
  startTime: '',
  endTime: '',
  seekFast: true,
  hwAccel: 'none',
  threads: 0,
  extraInputArgs: '',
  extraOutputArgs: '',
  inputMode: 'file',
  inputUrl: '',
  ytdlpFormat: 'bestvideo+bestaudio/best',
  activeTab: 'files',
  showLog: false
}

// ─── Command builder ──────────────────────────────────────────────────────────

export function buildFFmpegArgs(s: AppSettings, streamUrls: string[] = []): string[] {
  const hasInput = s.inputMode === 'url' ? !!s.inputUrl : !!s.inputFile
  if (!hasInput || !s.outputFile) return []
  const args: string[] = []

  // Hardware acceleration
  if (s.hwAccel && s.hwAccel !== 'none') {
    args.push('-hwaccel', s.hwAccel)
    if (s.hwAccel === 'vaapi') args.push('-vaapi_device', '/dev/dri/renderD128')
  }

  // Extra input flags
  if (s.extraInputArgs.trim()) {
    args.push(...s.extraInputArgs.trim().split(/\s+/).filter(Boolean))
  }

  // Seek (fast = before -i, accurate = after -i)
  if (s.seekFast && s.startTime) args.push('-ss', s.startTime)
  if (s.inputMode === 'url') {
    const inputs = streamUrls.length > 0 ? streamUrls : [s.inputUrl]
    for (const u of inputs) args.push('-i', u)
    // When yt-dlp splits video+audio into two streams, map them explicitly
    if (inputs.length >= 2) args.push('-map', '0:v:0', '-map', '1:a:0')
  } else {
    args.push('-i', s.inputFile)
  }
  if (!s.seekFast && s.startTime) args.push('-ss', s.startTime)
  if (s.endTime) args.push('-to', s.endTime)

  // ── Video ────────────────────────────────────────────────────────────────────
  if (!s.videoEnabled) {
    args.push('-vn')
  } else if (s.videoCodec === 'copy') {
    args.push('-c:v', 'copy')
  } else if (s.videoCodec) {
    args.push('-c:v', s.videoCodec)

    if (s.videoUseCRF) {
      args.push('-crf', s.videoCRF.toString())
    } else if (s.videoBitrate) {
      args.push('-b:v', s.videoBitrate)
    }

    if (s.videoPreset) args.push('-preset', s.videoPreset)

    // Video filter chain
    const vf: string[] = []
    if (s.resolution !== 'original' && s.resolution) {
      if (s.resolution === 'custom') {
        vf.push(`scale=${s.customWidth || '-2'}:${s.customHeight || '-2'}`)
      } else {
        const [w, h] = s.resolution.split('x')
        vf.push(`scale=${w}:${h}`)
      }
    }
    if (s.frameRate !== 'original' && s.frameRate) {
      const fps = s.frameRate === 'custom' ? s.customFrameRate : s.frameRate
      if (fps) vf.push(`fps=${fps}`)
    }
    if (vf.length > 0) args.push('-vf', vf.join(','))

    if (s.pixFmt && s.pixFmt !== 'auto') args.push('-pix_fmt', s.pixFmt)
  }

  // ── Audio ────────────────────────────────────────────────────────────────────
  if (!s.audioEnabled) {
    args.push('-an')
  } else if (s.audioCodec === 'copy') {
    args.push('-c:a', 'copy')
  } else if (s.audioCodec) {
    args.push('-c:a', s.audioCodec)
    if (s.audioBitrate) args.push('-b:a', s.audioBitrate)
    if (s.sampleRate !== 'original') args.push('-ar', s.sampleRate)
    if (s.channels !== 'original') args.push('-ac', s.channels)
    if (s.audioVolume !== 100) {
      args.push('-af', `volume=${(s.audioVolume / 100).toFixed(3)}`)
    }
  }

  // Threads, extra output flags, overwrite, output
  if (s.threads > 0) args.push('-threads', s.threads.toString())
  if (s.extraOutputArgs.trim()) {
    args.push(...s.extraOutputArgs.trim().split(/\s+/).filter(Boolean))
  }
  args.push('-y', s.outputFile)

  return args
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'files',    label: 'Files'    },
  { id: 'video',    label: 'Video'    },
  { id: 'audio',    label: 'Audio'    },
  { id: 'trim',     label: 'Trim'     },
  { id: 'advanced', label: 'Advanced' }
]

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const {
    ffmpegVersion, ffmpegAvailable, loading,
    videoEncoders, audioEncoders, formats, hwAccels,
    ytdlpAvailable,
    conversionState, logs,
    startConversion, cancelConversion, resetConversion, clearLogs
  } = useFFmpeg()

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [mediaInfo, setMediaInfo] = useState<FFprobeOutput | null>(null)
  const [probing, setProbing] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [cmdCopied, setCmdCopied] = useState(false)
  const [ytdlpInfo, setYtdlpInfo] = useState<YtdlpInfo | null>(null)
  const [resolvedStreamUrls, setResolvedStreamUrls] = useState<string[]>([])
  const [urlResolving, setUrlResolving] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  const update = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
  }, [])

  useEffect(() => {
    const acceptFileDrop = (event: DragEvent) => {
      if (!event.dataTransfer) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }

    window.addEventListener('dragenter', acceptFileDrop)
    window.addEventListener('dragover', acceptFileDrop)
    window.addEventListener('drop', acceptFileDrop)

    return () => {
      window.removeEventListener('dragenter', acceptFileDrop)
      window.removeEventListener('dragover', acceptFileDrop)
      window.removeEventListener('drop', acceptFileDrop)
    }
  }, [])

  // Auto-suggest output filename and probe when input file changes
  useEffect(() => {
    if (settings.inputMode !== 'file') return
    if (!settings.inputFile) { setMediaInfo(null); return }
    const base = settings.inputFile.replace(/\.[^.]+$/, '')
    const ext  = settings.outputFormat || 'mp4'
    if (!settings.outputFile) {
      update({ outputFile: `${base}_out.${ext}` })
    }
    // Probe
    setProbing(true)
    api.probe(settings.inputFile)
      .then(setMediaInfo)
      .catch(() => setMediaInfo(null))
      .finally(() => setProbing(false))
  }, [settings.inputFile, settings.inputMode])

  // Update output extension when format changes
  useEffect(() => {
    if (settings.outputFile && settings.outputFormat) {
      const noExt = settings.outputFile.replace(/\.[^.]+$/, '')
      update({ outputFile: `${noExt}.${settings.outputFormat}` })
    }
  }, [settings.outputFormat])

  // Clear cached stream URLs whenever the source URL or quality format changes
  useEffect(() => {
    setResolvedStreamUrls([])
    setUrlError(null)
  }, [settings.inputUrl, settings.ytdlpFormat])

  const ffmpegArgs = useMemo(() => buildFFmpegArgs(settings, resolvedStreamUrls), [settings, resolvedStreamUrls])
  const command    = useMemo(() => ['ffmpeg', ...ffmpegArgs].join(' '), [ffmpegArgs])
  const needsYtdlp = settings.inputMode === 'url' && YTDLP_URL_PATTERN.test(settings.inputUrl)
  const canConvert = (settings.inputMode === 'url' ? !!settings.inputUrl : !!settings.inputFile) &&
    !!settings.outputFile && ffmpegAvailable && conversionState.status !== 'running' && !urlResolving &&
    !(needsYtdlp && !ytdlpAvailable)

  const applyPreset = useCallback((preset: Preset) => {
    setSettings((prev) => ({ ...prev, ...preset.settings }))
    setShowPresets(false)
  }, [])

  const handleStart = useCallback(async () => {
    setUrlError(null)
    // For social-media URLs, resolve the stream URL(s) via yt-dlp first
    if (settings.inputMode === 'url' && settings.inputUrl && resolvedStreamUrls.length === 0) {
      if (needsYtdlp) {
        setUrlResolving(true)
        try {
          const urls = await api.getStreamUrls(settings.inputUrl, settings.ytdlpFormat)
          setResolvedStreamUrls(urls)
          startConversion(buildFFmpegArgs(settings, urls))
        } catch (e: unknown) {
          setUrlError(e instanceof Error ? e.message : 'Failed to resolve web video URL')
        } finally {
          setUrlResolving(false)
        }
        return
      }
    }
    startConversion(ffmpegArgs)
  }, [ffmpegArgs, settings, resolvedStreamUrls, needsYtdlp, startConversion])

  const copyCommand = useCallback(async () => {
    await navigator.clipboard.writeText(command)
    setCmdCopied(true)
    setTimeout(() => setCmdCopied(false), 2000)
  }, [command])

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!ffmpegAvailable && !loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-400 p-8">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <h2 className="text-xl font-semibold text-zinc-200">FFmpeg not found</h2>
        <p className="text-center text-sm max-w-sm">
          Please install <code className="text-violet-400">ffmpeg</code> and make sure it is in your{' '}
          <code className="text-violet-400">PATH</code>. Then restart FFmpeg UI.
        </p>
        <pre className="text-xs bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 mt-2">
          {`# Arch Linux\nsudo pacman -S ffmpeg\n\n# Ubuntu/Debian\nsudo apt install ffmpeg\n\n# macOS\nbrew install ffmpeg`}
        </pre>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-violet-400" />
          <span className="font-semibold text-zinc-100 text-sm">FFmpeg UI</span>
          {ffmpegVersion && (
            <span className="text-xs text-zinc-500 font-mono ml-1">{ffmpegVersion}</span>
          )}
          {loading && <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin ml-1" />}
        </div>

        {/* Presets */}
        <div className="relative">
          <button
            className="btn-ghost text-xs py-1 px-3"
            onClick={() => setShowPresets(!showPresets)}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Presets
            <ChevronDown className="w-3 h-3" />
          </button>
          {showPresets && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  className="w-full text-left px-4 py-2.5 hover:bg-zinc-800 transition-colors"
                  onClick={() => applyPreset(p)}
                >
                  <div className="text-sm font-medium text-zinc-100">{p.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{p.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-zinc-800 bg-zinc-900 shrink-0 px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => update({ activeTab: tab.id })}
            className={`
              px-5 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
              ${settings.activeTab === tab.id
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {settings.activeTab === 'files' && (
          <>
            <FileSection
              inputFile={settings.inputFile}
              outputFile={settings.outputFile}
              outputFormat={settings.outputFormat}
              inputMode={settings.inputMode}
              inputUrl={settings.inputUrl}
              ytdlpFormat={settings.ytdlpFormat}
              formats={formats}
              ytdlpAvailable={ytdlpAvailable}
              ytdlpInfo={ytdlpInfo}
              onChange={update}
              onYtdlpInfo={setYtdlpInfo}
            />
            {urlResolving && (
              <div className="flex items-center gap-2 text-zinc-500 text-xs pl-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Resolving web video streams...
              </div>
            )}
            {urlError && (
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-950/20 border border-red-800/30 rounded-lg p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <pre className="whitespace-pre-wrap break-all font-mono">{urlError}</pre>
              </div>
            )}
            {probing && (
              <div className="flex items-center gap-2 text-zinc-500 text-xs pl-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Probing file…
              </div>
            )}
            {mediaInfo && !probing && (
              <MediaInfoPanel info={mediaInfo} />
            )}
          </>
        )}
        {settings.activeTab === 'video' && (
          <VideoSection settings={settings} encoders={videoEncoders} onChange={update} />
        )}
        {settings.activeTab === 'audio' && (
          <AudioSection settings={settings} encoders={audioEncoders} onChange={update} />
        )}
        {settings.activeTab === 'trim' && (
          <TrimSection settings={settings} mediaInfo={mediaInfo} onChange={update} />
        )}
        {settings.activeTab === 'advanced' && (
          <AdvancedSection settings={settings} hwAccels={hwAccels} onChange={update} />
        )}
      </div>

      {/* ── Command preview ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-4 py-2">
        <div className="flex items-center gap-2">
          <TerminalSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <div className="flex-1 font-mono text-xs text-zinc-400 truncate">
            {command || <span className="text-zinc-600 italic">Select input & output files to build command…</span>}
          </div>
          {command && (
            <button
              onClick={copyCommand}
              title="Copy command"
              className="shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <ClipboardCopy className="w-3.5 h-3.5" />
            </button>
          )}
          {cmdCopied && (
            <span className="text-xs text-green-400 shrink-0">Copied!</span>
          )}
        </div>
      </div>

      {/* ── Progress + controls ──────────────────────────────────────────────── */}
      <ProgressSection
        conversionState={conversionState}
        outputFile={settings.outputFile}
        canConvert={canConvert}
        onStart={handleStart}
        onCancel={cancelConversion}
        onReset={resetConversion}
        onToggleLog={() => update({ showLog: !settings.showLog })}
        showLog={settings.showLog}
      />

      {/* ── Log viewer ───────────────────────────────────────────────────────── */}
      {settings.showLog && (
        <LogViewer logs={logs} onClear={clearLogs} />
      )}

      {/* Preset backdrop */}
      {showPresets && (
        <div className="fixed inset-0 z-40" onClick={() => setShowPresets(false)} />
      )}
    </div>
  )
}
