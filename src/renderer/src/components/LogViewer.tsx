import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'

interface Props {
  logs: string[]
  onClear: () => void
}

export default function LogViewer({ logs, onClear }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Colorize log lines
  function colorize(line: string): string {
    if (line.match(/error|fail|invalid|could not|no such/i)) return 'text-red-400'
    if (line.match(/warning|warn|deprecated/i)) return 'text-amber-400'
    if (line.match(/^\s*(frame|fps|time|bitrate|speed)/)) return 'text-violet-300'
    if (line.match(/stream|input|output|duration/i)) return 'text-sky-400'
    return 'text-zinc-400'
  }

  const allLines = logs
    .join('')
    .split(/\r?\n/)
    .filter((l) => l.trim())

  return (
    <div className="shrink-0 h-52 border-t border-zinc-800 bg-zinc-950 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
        <span className="text-xs text-zinc-500 font-medium">
          FFmpeg output
          {allLines.length > 0 && (
            <span className="ml-2 text-zinc-600">({allLines.length} lines)</span>
          )}
        </span>
        <button
          onClick={onClear}
          className="text-zinc-600 hover:text-zinc-300 transition-colors"
          title="Clear log"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Log content */}
      <div className="flex-1 overflow-y-auto font-mono text-xs p-2 space-y-px">
        {allLines.length === 0 ? (
          <p className="text-zinc-700 italic px-1">No output yet. Start a conversion to see FFmpeg logs here.</p>
        ) : (
          allLines.map((line, i) => (
            <div key={i} className={`leading-5 px-1 whitespace-pre-wrap break-all ${colorize(line)}`}>
              {line}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
