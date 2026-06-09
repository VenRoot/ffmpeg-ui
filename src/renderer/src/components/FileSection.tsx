import { useState, useCallback } from 'react'
import {
  FolderOpen, ArrowRight, Film, Link2,
  Loader2, AlertTriangle, ExternalLink, X
} from 'lucide-react'
import type { AppSettings, Format, YtdlpInfo } from '../types'

const api = window.ffmpegAPI

interface Props {
  inputFile: string
  outputFile: string
  outputFormat: string
  inputMode: 'file' | 'url'
  inputUrl: string
  ytdlpFormat: string
  formats: Format[]
  ytdlpAvailable: boolean
  ytdlpInfo: YtdlpInfo | null
  onChange: (partial: Partial<AppSettings>) => void
  onYtdlpInfo: (info: YtdlpInfo | null) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMON_FORMATS = [
  { value: 'mp4',  label: 'MP4'     },
  { value: 'mkv',  label: 'MKV'     },
  { value: 'webm', label: 'WebM'    },
  { value: 'avi',  label: 'AVI'     },
  { value: 'mov',  label: 'MOV'     },
  { value: 'ts',   label: 'MPEG-TS' },
  { value: 'mp3',  label: 'MP3'     },
  { value: 'aac',  label: 'AAC'     },
  { value: 'flac', label: 'FLAC'    },
  { value: 'ogg',  label: 'OGG'     },
  { value: 'opus', label: 'Opus'    },
  { value: 'wav',  label: 'WAV'     },
  { value: 'gif',  label: 'GIF'     },
]

const YTDLP_PRESETS = [
  { value: 'bestvideo+bestaudio/best',                              label: 'Best quality (default)' },
  { value: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]',  label: 'Best MP4'               },
  { value: 'bestvideo[height<=2160]+bestaudio/best[height<=2160]', label: 'Max 4K'                 },
  { value: 'bestvideo[height<=1080]+bestaudio/best[height<=1080]', label: 'Max 1080p'              },
  { value: 'bestvideo[height<=720]+bestaudio/best[height<=720]',   label: 'Max 720p'               },
  { value: 'bestvideo[height<=480]+bestaudio/best[height<=480]',   label: 'Max 480p'               },
  { value: 'bestaudio/best',                                        label: 'Audio only'             },
]

// Social-media domains that require yt-dlp to resolve
const YTDLP_PATTERN = /youtube|youtu\.be|twitch|tiktok|instagram|twitter|x\.com|vimeo|dailymotion|reddit/i

function fmtDur(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

function slugify(title: string): string {
  return title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, '_').slice(0, 120)
}

function pathFromFileUri(uri: string): string | null {
  const value = uri.trim()
  if (!value || value.startsWith('#')) return null

  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'file:') return null
    if (parsed.hostname && parsed.hostname !== 'localhost') return null
    return decodeURIComponent(parsed.pathname)
  } catch {
    return null
  }
}

function firstPathFromUriList(text: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    const value = line.trim()
    if (!value || value === 'copy' || value.startsWith('#')) continue
    if (value.startsWith('file:')) {
      const path = pathFromFileUri(value)
      if (path) return path
    }
    if (value.startsWith('/')) return value
  }
  return null
}

function itemText(item: DataTransferItem): Promise<string> {
  return new Promise((resolve) => item.getAsString((value) => resolve(value)))
}

async function getDroppedFilePath(dataTransfer: DataTransfer): Promise<string | null> {
  const file = dataTransfer.files[0] as (File & { path?: string }) | undefined
  if (file) {
    const electronPath = api.getPathForFile(file)
    if (electronPath) return electronPath
    if (file.path) return file.path
  }

  const uriText =
    dataTransfer.getData('text/uri-list') ||
    dataTransfer.getData('application/x-kde4-urilist') ||
    dataTransfer.getData('x-special/gnome-copied-files') ||
    dataTransfer.getData('text/plain') ||
    dataTransfer.getData('text/x-moz-url')

  const directPath = firstPathFromUriList(uriText)
  if (directPath) return directPath

  for (const item of Array.from(dataTransfer.items)) {
    if (item.kind !== 'string') continue
    if (!['text/uri-list', 'application/x-kde4-urilist', 'x-special/gnome-copied-files', 'text/plain', 'text/x-moz-url'].includes(item.type)) continue

    const path = firstPathFromUriList(await itemText(item))
    if (path) return path
  }

  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FileSection({
  inputFile, outputFile, outputFormat,
  inputMode, inputUrl, ytdlpFormat,
  formats, ytdlpAvailable, ytdlpInfo,
  onChange, onYtdlpInfo
}: Props) {
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [customFormat, setCustomFormat] = useState('')
  const [dropError, setDropError] = useState<string | null>(null)

  // ── File handlers ─────────────────────────────────────────────────────────

  const acceptDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    const path = await getDroppedFilePath(e.dataTransfer)
    if (path) {
      setDropError(null)
      onChange({ inputFile: path, outputFile: '' })
    } else {
      setDropError('Could not read a local file path from that drop. Use Browse if your file manager does not expose file:// drops on Wayland.')
    }
  }, [onChange])

  const browseInput = useCallback(async () => {
    const path = await api.openFile()
    if (path) {
      setDropError(null)
      onChange({ inputFile: path, outputFile: '' })
    }
  }, [onChange])

  const browseOutput = useCallback(async () => {
    const path = await api.saveFile(outputFile || undefined)
    if (path) {
      const fmt = path.split('.').pop() ?? outputFormat
      onChange({ outputFile: path, outputFormat: fmt })
    }
  }, [onChange, outputFile, outputFormat])

  // ── yt-dlp handlers ───────────────────────────────────────────────────────

  const clearUrl = useCallback(() => {
    onChange({ inputUrl: '' })
    onYtdlpInfo(null)
    setLoadError(null)
  }, [onChange, onYtdlpInfo])

  const loadUrlInfo = useCallback(async () => {
    const url = inputUrl.trim()
    if (!url) return
    setLoadingInfo(true)
    setLoadError(null)
    onYtdlpInfo(null)
    try {
      const info = await api.ytdlpInfo(url)
      onYtdlpInfo(info)
      // Auto-fill output filename from video title
      if (info.title && !outputFile) {
        onChange({ outputFile: `${slugify(info.title)}.${outputFormat}` })
      }
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'yt-dlp failed')
    } finally {
      setLoadingInfo(false)
    }
  }, [inputUrl, outputFile, outputFormat, onChange, onYtdlpInfo])

  // ── Derived ───────────────────────────────────────────────────────────────

  const isKnownPreset = YTDLP_PRESETS.some(p => p.value === ytdlpFormat)
  const isDirectUrl   = inputUrl && !YTDLP_PATTERN.test(inputUrl)

  const allFormats: Format[] = [
    ...COMMON_FORMATS.map(f => ({ name: f.value, description: f.label, canMux: true, canDemux: false })),
    ...formats.filter(f => !COMMON_FORMATS.some(c => c.value === f.name))
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="section-card animate-fade-in">
      {/* Mode tabs */}
      <div className="flex border-b border-zinc-800">
        {(['file', 'url'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onChange({ inputMode: mode })}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
              ${inputMode === mode
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            {mode === 'file'
              ? <><Film className="w-3.5 h-3.5" /> Local file</>
              : <><Link2 className="w-3.5 h-3.5" /> Web URL{!ytdlpAvailable && <span className="ml-1 text-amber-500 text-xs">⚠ yt-dlp</span>}</>
            }
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">

        {/* ── File mode ───────────────────────────────────────────────────── */}
        {inputMode === 'file' && (
          <div>
            <label className="field-label">Input file</label>
            <div
              className={`flex items-center gap-2 rounded-lg border-2 border-dashed p-3 transition-colors cursor-pointer
                ${inputFile
                  ? 'border-zinc-700 bg-zinc-800/50'
                  : 'border-zinc-700 hover:border-violet-600 bg-zinc-800/30 hover:bg-zinc-800/60'}`}
              onDrop={handleDrop}
              onDragOver={acceptDrop}
              onDragEnter={acceptDrop}
              onClick={browseInput}
            >
              <FolderOpen className="w-4 h-4 text-zinc-500 shrink-0" />
              {inputFile
                ? <span className="text-sm text-zinc-200 truncate font-mono" title={inputFile}>{inputFile}</span>
                : <span className="text-sm text-zinc-500">Drop a media file here, or <span className="text-violet-400">click to browse</span></span>
              }
            </div>
            {dropError && (
              <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-lg p-2.5 mt-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{dropError}</span>
              </div>
            )}
          </div>
        )}

        {/* ── URL mode ────────────────────────────────────────────────────── */}
        {inputMode === 'url' && (
          <div className="space-y-3">
            {/* yt-dlp warning */}
            {!ytdlpAvailable && (
              <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-lg p-3">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>yt-dlp not found.</strong> Install it for YouTube / social-media support:{' '}
                  <code className="text-amber-300">sudo pacman -S yt-dlp</code>
                  <br />Direct HTTP links to video files (mp4, m3u8, …) still work without it.
                </span>
              </div>
            )}

            {/* URL input */}
            <div>
              <label className="field-label">Video URL</label>
              <div className="flex gap-1.5">
                <input
                  className="field-input flex-1"
                  placeholder="https://youtube.com/watch?v=… or a direct .mp4 / .m3u8 link"
                  value={inputUrl}
                  onChange={e => { onChange({ inputUrl: e.target.value }); onYtdlpInfo(null); setLoadError(null) }}
                  onKeyDown={e => e.key === 'Enter' && loadUrlInfo()}
                />
                {inputUrl && (
                  <button className="btn-ghost px-2.5" onClick={clearUrl} title="Clear">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  className="btn-primary px-3 gap-1.5"
                  disabled={!inputUrl.trim() || loadingInfo || (!ytdlpAvailable && YTDLP_PATTERN.test(inputUrl))}
                  onClick={loadUrlInfo}
                  title={!ytdlpAvailable && YTDLP_PATTERN.test(inputUrl) ? 'yt-dlp required for this URL' : undefined}
                >
                  {loadingInfo
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading…</>
                    : <><ExternalLink className="w-3.5 h-3.5" />Load info</>
                  }
                </button>
              </div>
              {isDirectUrl && !ytdlpInfo && (
                <p className="text-xs text-zinc-600 mt-1">
                  Looks like a direct link — ffmpeg will use it as-is. Click <em>Load info</em> to fetch metadata via yt-dlp, or just convert directly.
                </p>
              )}
            </div>

            {/* Error */}
            {loadError && (
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-950/20 border border-red-800/30 rounded-lg p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <pre className="whitespace-pre-wrap break-all font-mono">{loadError}</pre>
              </div>
            )}

            {/* Video info card */}
            {ytdlpInfo && (
              <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3 space-y-3 animate-fade-in">
                <div className="flex items-start gap-3">
                  {ytdlpInfo.thumbnail && (
                    <img src={ytdlpInfo.thumbnail} alt="" className="w-24 h-14 object-cover rounded shrink-0 bg-zinc-700" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 line-clamp-2">{ytdlpInfo.title}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-zinc-500">
                      {ytdlpInfo.uploader   && <span>👤 {ytdlpInfo.uploader}</span>}
                      {ytdlpInfo.duration   != null && <span>⏱ {fmtDur(ytdlpInfo.duration)}</span>}
                      {ytdlpInfo.extractor  && <span>🌐 {ytdlpInfo.extractor}</span>}
                      {ytdlpInfo.formats    && <span>📋 {ytdlpInfo.formats.length} formats</span>}
                    </div>
                  </div>
                </div>

                {/* Quality / format selector */}
                {ytdlpAvailable && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="field-label">Quality</label>
                      <select
                        className="field-select"
                        value={isKnownPreset ? ytdlpFormat : 'custom'}
                        onChange={e => {
                          if (e.target.value !== 'custom') onChange({ ytdlpFormat: e.target.value })
                          else onChange({ ytdlpFormat: customFormat })
                        }}
                      >
                        {YTDLP_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        <option value="custom">Custom format string…</option>
                      </select>
                    </div>
                    {!isKnownPreset && (
                      <div>
                        <label className="field-label">Format string</label>
                        <input
                          className="field-input font-mono text-xs"
                          placeholder="bestvideo+bestaudio"
                          value={isKnownPreset ? '' : ytdlpFormat}
                          onChange={e => { setCustomFormat(e.target.value); onChange({ ytdlpFormat: e.target.value }) }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Output row (shared) ─────────────────────────────────────────── */}
        <div className="flex gap-3 items-end">
          <div className="w-40 shrink-0">
            <label className="field-label">Output format</label>
            <select
              className="field-select"
              value={outputFormat}
              onChange={e => onChange({ outputFormat: e.target.value })}
            >
              {allFormats.map(f => (
                <option key={f.name} value={f.name}>
                  {f.description !== f.name ? `${f.name} – ${f.description}` : f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center self-center pb-0.5">
            <ArrowRight className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="flex-1">
            <label className="field-label">Output file</label>
            <div className="flex gap-1">
              <input
                className="field-input flex-1 font-mono text-xs"
                placeholder="/path/to/output.mp4"
                value={outputFile}
                onChange={e => onChange({ outputFile: e.target.value })}
              />
              <button className="btn-ghost text-xs px-2.5" onClick={browseOutput} title="Browse">
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
