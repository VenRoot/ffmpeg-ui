import type {
  Progress,
  ConversionResult,
  Encoder,
  Format,
  YtdlpInfo
} from './types'

// ─── Window API (exposed by preload) ─────────────────────────────────────────

declare global {
  interface Window {
    ffmpegAPI: {
      openFile: () => Promise<string | null>
      getPathForFile: (file: File) => string
      saveFile: (defaultPath?: string) => Promise<string | null>
      openPath: (filePath: string) => Promise<string>
      showItemInFolder: (filePath: string) => void
      getVersion: () => Promise<string>
      getEncoders: () => Promise<Encoder[]>
      getFormats: () => Promise<Format[]>
      getHwAccels: () => Promise<string[]>
      probe: (filePath: string) => Promise<import('./types').FFprobeOutput>
      start: (args: string[]) => Promise<boolean>
      cancel: () => Promise<boolean>
      onProgress: (cb: (progress: Progress) => void) => () => void
      onLog: (cb: (text: string) => void) => () => void
      onDone: (cb: (result: ConversionResult) => void) => () => void
      // yt-dlp
      checkYtdlp: () => Promise<boolean>
      ytdlpInfo: (url: string) => Promise<YtdlpInfo>
      getStreamUrls: (url: string, format: string) => Promise<string[]>
    }
  }
}
