// ─── FFmpeg entities ─────────────────────────────────────────────────────────

export interface Encoder {
  name: string
  description: string
  type: 'video' | 'audio' | 'subtitle'
  isExperimental: boolean
}

export interface Format {
  name: string
  description: string
  canMux: boolean
  canDemux: boolean
}

// ─── FFprobe output ──────────────────────────────────────────────────────────

export interface FFprobeStream {
  index: number
  codec_type: 'video' | 'audio' | 'subtitle' | 'data' | 'attachment'
  codec_name?: string
  codec_long_name?: string
  profile?: string
  width?: number
  height?: number
  r_frame_rate?: string
  avg_frame_rate?: string
  bit_rate?: string
  sample_rate?: string
  channels?: number
  channel_layout?: string
  pix_fmt?: string
  tags?: Record<string, string>
  duration?: string
}

export interface FFprobeFormat {
  filename: string
  nb_streams: number
  format_name: string
  format_long_name: string
  duration?: string
  size?: string
  bit_rate?: string
  tags?: Record<string, string>
}

export interface FFprobeOutput {
  streams: FFprobeStream[]
  format: FFprobeFormat
}

// ─── Progress / conversion state ─────────────────────────────────────────────

export interface Progress {
  frame: number
  fps: number
  q: number
  size: string
  time: string
  bitrate: string
  speed: string
  percent: number
  currentSec: number
  totalSec: number
}

export interface ConversionResult {
  success: boolean
  cancelled?: boolean
  code?: number
  error?: string
}

export type ConversionStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled'

export interface ConversionState {
  status: ConversionStatus
  progress: Progress | null
  error?: string
}

// ─── App settings ────────────────────────────────────────────────────────────

export interface AppSettings {
  // Files
  inputFile: string
  outputFile: string
  outputFormat: string

  // Video
  videoEnabled: boolean
  videoCodec: string
  videoBitrate: string
  videoUseCRF: boolean
  videoCRF: number
  videoPreset: string
  resolution: string
  customWidth: string
  customHeight: string
  frameRate: string
  customFrameRate: string
  pixFmt: string

  // Audio
  audioEnabled: boolean
  audioCodec: string
  audioBitrate: string
  sampleRate: string
  channels: string
  audioVolume: number

  // Trim
  startTime: string
  endTime: string
  seekFast: boolean

  // Advanced
  hwAccel: string
  threads: number
  extraInputArgs: string
  extraOutputArgs: string

  // UI state
  activeTab: TabId
  showLog: boolean
}

export type TabId = 'files' | 'video' | 'audio' | 'trim' | 'advanced'

// ─── Preset ──────────────────────────────────────────────────────────────────

export interface Preset {
  id: string
  label: string
  description: string
  settings: Partial<AppSettings>
}
