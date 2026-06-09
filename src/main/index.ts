import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { spawn, ChildProcess } from 'child_process'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Encoder {
  name: string
  description: string
  type: 'video' | 'audio' | 'subtitle'
  isExperimental: boolean
}

interface Format {
  name: string
  description: string
  canMux: boolean
  canDemux: boolean
}

// ─── State ───────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null
let ffmpegProcess: ChildProcess | null = null

// ─── Window ──────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 880,
    minWidth: 960,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#09090b',
    title: 'FFmpeg UI',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow!.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    if (ffmpegProcess) {
      ffmpegProcess.kill('SIGKILL')
      ffmpegProcess = null
    }
  })
}

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
  app.setAppUserModelId('com.ffmpegui.app')
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (ffmpegProcess) ffmpegProcess.kill('SIGKILL')
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC: File dialogs ───────────────────────────────────────────────────────

ipcMain.handle('dialog:openFile', async (_, options?: Electron.OpenDialogOptions) => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      {
        name: 'Media Files',
        extensions: [
          'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'ts', 'mts',
          'mp3', 'aac', 'flac', 'ogg', 'opus', 'wav', 'm4a', 'wma',
          'gif', 'apng'
        ]
      },
      { name: 'All Files', extensions: ['*'] },
      ...(options?.filters ?? [])
    ],
    title: 'Select Input File',
    ...options
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:saveFile', async (_, options?: Electron.SaveDialogOptions) => {
  if (!mainWindow) return null
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'MP4', extensions: ['mp4'] },
      { name: 'MKV', extensions: ['mkv'] },
      { name: 'WebM', extensions: ['webm'] },
      { name: 'MP3', extensions: ['mp3'] },
      { name: 'All Files', extensions: ['*'] },
      ...(options?.filters ?? [])
    ],
    title: 'Save Output File',
    ...options
  })
  return result.canceled ? null : result.filePath
})

ipcMain.handle('shell:openPath', async (_, filePath: string) => {
  return shell.openPath(filePath)
})

ipcMain.handle('shell:showItemInFolder', (_, filePath: string) => {
  shell.showItemInFolder(filePath)
})

// ─── IPC: FFmpeg discovery ───────────────────────────────────────────────────

ipcMain.handle('ffmpeg:version', () => {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-version'])
    let out = ''
    proc.stdout?.on('data', (d: Buffer) => (out += d.toString()))
    proc.stderr?.on('data', (d: Buffer) => (out += d.toString()))
    proc.on('close', () => {
      const m = out.match(/ffmpeg version (\S+)/)
      resolve(m ? m[1] : 'unknown')
    })
    proc.on('error', () => reject(new Error('ffmpeg not found in PATH')))
  })
})

ipcMain.handle('ffmpeg:getEncoders', () => {
  return new Promise<Encoder[]>((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-encoders', '-v', 'quiet'])
    let out = ''
    proc.stdout?.on('data', (d: Buffer) => (out += d.toString()))
    proc.stderr?.on('data', (d: Buffer) => (out += d.toString()))
    proc.on('close', () => {
      try { resolve(parseEncoders(out)) } catch (e) { reject(e) }
    })
    proc.on('error', () => reject(new Error('ffmpeg not found in PATH')))
  })
})

ipcMain.handle('ffmpeg:getFormats', () => {
  return new Promise<Format[]>((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-formats', '-v', 'quiet'])
    let out = ''
    proc.stdout?.on('data', (d: Buffer) => (out += d.toString()))
    proc.stderr?.on('data', (d: Buffer) => (out += d.toString()))
    proc.on('close', () => {
      try { resolve(parseFormats(out)) } catch (e) { reject(e) }
    })
    proc.on('error', () => reject(new Error('ffmpeg not found in PATH')))
  })
})

ipcMain.handle('ffmpeg:getHwAccels', () => {
  return new Promise<string[]>((resolve) => {
    const proc = spawn('ffmpeg', ['-hwaccels', '-v', 'quiet'])
    let out = ''
    proc.stdout?.on('data', (d: Buffer) => (out += d.toString()))
    proc.stderr?.on('data', (d: Buffer) => (out += d.toString()))
    proc.on('close', () => {
      const lines = out.split('\n').slice(1).map((l) => l.trim()).filter(Boolean)
      resolve(lines)
    })
    proc.on('error', () => resolve([]))
  })
})

// ─── IPC: FFprobe ────────────────────────────────────────────────────────────

ipcMain.handle('ffmpeg:probe', (_, filePath: string) => {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      '-show_error',
      filePath
    ]
    const proc = spawn('ffprobe', args)
    let out = ''
    proc.stdout?.on('data', (d: Buffer) => (out += d.toString()))
    proc.on('close', (code) => {
      if (code === 0) {
        try { resolve(JSON.parse(out)) }
        catch { reject(new Error('Failed to parse ffprobe output')) }
      } else {
        reject(new Error(`ffprobe exited with code ${code}`))
      }
    })
    proc.on('error', () => reject(new Error('ffprobe not found in PATH. Install ffmpeg.')))
  })
})

// ─── IPC: Conversion ─────────────────────────────────────────────────────────

ipcMain.handle('ffmpeg:start', (_, args: string[]) => {
  return new Promise<boolean>((resolve, reject) => {
    // Kill any existing process
    if (ffmpegProcess) {
      ffmpegProcess.kill('SIGKILL')
      ffmpegProcess = null
    }

    ffmpegProcess = spawn('ffmpeg', args)
    let totalDurationSec: number | null = null
    let stderr = ''

    ffmpegProcess.stdout?.on('data', (d: Buffer) => {
      const text = d.toString()
      mainWindow?.webContents.send('ffmpeg:log', text)
    })

    ffmpegProcess.stderr?.on('data', (d: Buffer) => {
      const text = d.toString()
      stderr += text
      mainWindow?.webContents.send('ffmpeg:log', text)

      // Extract total duration once
      if (totalDurationSec === null) {
        const m = text.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/)
        if (m) {
          totalDurationSec =
            parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3])
        }
      }

      // Parse progress line: frame=... fps=... size=... time=... bitrate=... speed=...
      const pm = text.match(
        /frame=\s*(\d+)\s+fps=\s*([\d.]+)\s+q=([\d.-]+)\s+(?:L?size=\s*(\S+)\s+)?time=(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+bitrate=\s*(\S+)\s+speed=\s*(\S+)/
      )
      if (pm) {
        const [hh, mm, ss] = pm[5].split(':').map(parseFloat)
        const currentSec = hh * 3600 + mm * 60 + ss
        const percent =
          totalDurationSec && totalDurationSec > 0
            ? Math.min(100, (currentSec / totalDurationSec) * 100)
            : 0

        mainWindow?.webContents.send('ffmpeg:progress', {
          frame: parseInt(pm[1]),
          fps: parseFloat(pm[2]),
          q: parseFloat(pm[3]),
          size: pm[4] ?? 'N/A',
          time: pm[5],
          bitrate: pm[6],
          speed: pm[7],
          percent: Math.round(percent * 10) / 10,
          currentSec,
          totalSec: totalDurationSec ?? 0
        })
      }
    })

    ffmpegProcess.on('close', (code, signal) => {
      ffmpegProcess = null
      if (code === 0) {
        mainWindow?.webContents.send('ffmpeg:done', { success: true })
        resolve(true)
      } else if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        mainWindow?.webContents.send('ffmpeg:done', { success: false, cancelled: true })
        resolve(false)
      } else {
        const lastLines = stderr.split('\n').filter(Boolean).slice(-10).join('\n')
        mainWindow?.webContents.send('ffmpeg:done', {
          success: false,
          code,
          error: lastLines
        })
        reject(new Error(`FFmpeg exited with code ${code}`))
      }
    })

    ffmpegProcess.on('error', (err) => {
      ffmpegProcess = null
      mainWindow?.webContents.send('ffmpeg:done', { success: false, error: err.message })
      reject(err)
    })
  })
})

ipcMain.handle('ffmpeg:cancel', () => {
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGTERM')
    setTimeout(() => {
      if (ffmpegProcess) {
        ffmpegProcess.kill('SIGKILL')
        ffmpegProcess = null
      }
    }, 3000)
    return true
  }
  return false
})

// ─── Parsers ─────────────────────────────────────────────────────────────────

/**
 * Parse output of `ffmpeg -encoders`.
 * Format: " V.S... encoder_name    Long description"
 * Flags: [V/A/S] [F] [S] [X] [B] [D]
 */
function parseEncoders(output: string): Encoder[] {
  const encoders: Encoder[] = []
  let parsing = false
  for (const line of output.split('\n')) {
    if (line.includes('------')) { parsing = true; continue }
    if (!parsing) continue
    const m = line.match(/^\s([VAS])([F.])([S.])([X.])([B.])([D.])\s+(\S+)\s+(.+)$/)
    if (!m) continue
    const typeChar = m[1]
    encoders.push({
      name: m[7].trim(),
      description: m[8].trim(),
      type: typeChar === 'V' ? 'video' : typeChar === 'A' ? 'audio' : 'subtitle',
      isExperimental: m[4] === 'X'
    })
  }
  return encoders
}

/**
 * Parse output of `ffmpeg -formats`.
 * Format: " D  3dostr     3DO STR"
 * Flags: [D=demux] [E=mux]
 */
function parseFormats(output: string): Format[] {
  const formats: Format[] = []
  let parsing = false
  for (const line of output.split('\n')) {
    if (line.trim().startsWith('--')) { parsing = true; continue }
    if (!parsing) continue
    const m = line.match(/^\s([D ])([E ])\s+(\S+)\s+(.+)$/)
    if (!m) continue
    // Some entries list multiple names separated by commas
    for (const name of m[3].split(',')) {
      formats.push({
        canDemux: m[1] === 'D',
        canMux: m[2] === 'E',
        name: name.trim(),
        description: m[4].trim()
      })
    }
  }
  return formats
}
