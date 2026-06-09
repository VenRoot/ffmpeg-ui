import { contextBridge, ipcRenderer } from 'electron'

// ─── Exposed API ─────────────────────────────────────────────────────────────

const api = {
  /** Open a native file-picker for input media */
  openFile: () => ipcRenderer.invoke('dialog:openFile'),

  /** Open a native save-dialog for the output file */
  saveFile: (defaultPath?: string) =>
    ipcRenderer.invoke('dialog:saveFile', { defaultPath }),

  /** Open a path in the default file manager / app */
  openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),

  /** Reveal a file in the native file manager */
  showItemInFolder: (filePath: string) =>
    ipcRenderer.invoke('shell:showItemInFolder', filePath),

  /** Query installed ffmpeg version string */
  getVersion: (): Promise<string> => ipcRenderer.invoke('ffmpeg:version'),

  /** Return all available encoders parsed from `ffmpeg -encoders` */
  getEncoders: () => ipcRenderer.invoke('ffmpeg:getEncoders'),

  /** Return all muxable formats parsed from `ffmpeg -formats` */
  getFormats: () => ipcRenderer.invoke('ffmpeg:getFormats'),

  /** Return all hardware accelerators available on this system */
  getHwAccels: (): Promise<string[]> => ipcRenderer.invoke('ffmpeg:getHwAccels'),

  /** Run ffprobe on the given file path and return the JSON result */
  probe: (filePath: string) => ipcRenderer.invoke('ffmpeg:probe', filePath),

  /** Start an ffmpeg process with the supplied argument array */
  start: (args: string[]): Promise<boolean> => ipcRenderer.invoke('ffmpeg:start', args),

  /** Send SIGTERM to the running ffmpeg process */
  cancel: (): Promise<boolean> => ipcRenderer.invoke('ffmpeg:cancel'),

  /** Subscribe to real-time progress events; returns a cleanup function */
  onProgress: (cb: (progress: Progress) => void) => {
    const handler = (_: unknown, p: Progress) => cb(p)
    ipcRenderer.on('ffmpeg:progress', handler)
    return () => ipcRenderer.off('ffmpeg:progress', handler)
  },

  /** Subscribe to raw ffmpeg stderr/stdout log lines */
  onLog: (cb: (text: string) => void) => {
    const handler = (_: unknown, t: string) => cb(t)
    ipcRenderer.on('ffmpeg:log', handler)
    return () => ipcRenderer.off('ffmpeg:log', handler)
  },

  /** Subscribe to the completion / error event */
  onDone: (cb: (result: ConversionResult) => void) => {
    const handler = (_: unknown, r: ConversionResult) => cb(r)
    ipcRenderer.on('ffmpeg:done', handler)
    return () => ipcRenderer.off('ffmpeg:done', handler)
  }
}

contextBridge.exposeInMainWorld('ffmpegAPI', api)

// ─── Shared types (also declared in env.d.ts for the renderer) ────────────────

interface Progress {
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

interface ConversionResult {
  success: boolean
  cancelled?: boolean
  code?: number
  error?: string
}
