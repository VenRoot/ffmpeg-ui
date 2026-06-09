import { useCallback } from 'react'
import { FolderOpen, ArrowRight, Film } from 'lucide-react'
import type { AppSettings, Format } from '../types'

const api = window.ffmpegAPI

interface Props {
  inputFile: string
  outputFile: string
  outputFormat: string
  formats: Format[]
  onChange: (partial: Partial<AppSettings>) => void
}

// Common output formats with friendly labels
const COMMON_FORMATS = [
  { value: 'mp4',  label: 'MP4'      },
  { value: 'mkv',  label: 'MKV'      },
  { value: 'webm', label: 'WebM'     },
  { value: 'avi',  label: 'AVI'      },
  { value: 'mov',  label: 'MOV'      },
  { value: 'ts',   label: 'MPEG-TS'  },
  { value: 'mp3',  label: 'MP3'      },
  { value: 'aac',  label: 'AAC'      },
  { value: 'flac', label: 'FLAC'     },
  { value: 'ogg',  label: 'OGG'      },
  { value: 'opus', label: 'Opus'     },
  { value: 'wav',  label: 'WAV'      },
  { value: 'gif',  label: 'GIF'      },
]

export default function FileSection({ inputFile, outputFile, outputFormat, formats, onChange }: Props) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) onChange({ inputFile: file.path, outputFile: '' })
    },
    [onChange]
  )

  const browseInput = useCallback(async () => {
    const path = await api.openFile()
    if (path) onChange({ inputFile: path, outputFile: '' })
  }, [onChange])

  const browseOutput = useCallback(async () => {
    const path = await api.saveFile(outputFile || undefined)
    if (path) {
      const fmt = path.split('.').pop() ?? outputFormat
      onChange({ outputFile: path, outputFormat: fmt })
    }
  }, [onChange, outputFile, outputFormat])

  // Build unique sorted format list (common ones first, then rest from ffmpeg)
  const allFormats: Format[] = [
    ...COMMON_FORMATS.map((f) => ({
      name: f.value,
      description: f.label,
      canMux: true,
      canDemux: false
    })),
    ...formats.filter((f) => !COMMON_FORMATS.some((c) => c.value === f.name))
  ]

  return (
    <div className="section-card animate-fade-in">
      <div className="section-header border-b border-zinc-800">
        <Film className="w-4 h-4 text-violet-400" />
        Files
      </div>

      <div className="p-4 space-y-4">
        {/* Input file */}
        <div>
          <label className="field-label">Input file</label>
          <div
            className={`
              flex items-center gap-2 rounded-lg border-2 border-dashed p-3 transition-colors cursor-pointer
              ${inputFile
                ? 'border-zinc-700 bg-zinc-800/50'
                : 'border-zinc-700 hover:border-violet-600 bg-zinc-800/30 hover:bg-zinc-800/60'
              }
            `}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={browseInput}
          >
            <FolderOpen className="w-4 h-4 text-zinc-500 shrink-0" />
            {inputFile ? (
              <span className="text-sm text-zinc-200 truncate font-mono" title={inputFile}>
                {inputFile}
              </span>
            ) : (
              <span className="text-sm text-zinc-500">
                Drop a media file here, or <span className="text-violet-400">click to browse</span>
              </span>
            )}
          </div>
        </div>

        {/* Output format + file */}
        <div className="flex gap-3 items-end">
          <div className="w-40 shrink-0">
            <label className="field-label">Output format</label>
            <select
              className="field-select"
              value={outputFormat}
              onChange={(e) => onChange({ outputFormat: e.target.value })}
            >
              {allFormats.map((f) => (
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
                onChange={(e) => onChange({ outputFile: e.target.value })}
              />
              <button
                className="btn-ghost text-xs px-2.5"
                onClick={browseOutput}
                title="Browse"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
