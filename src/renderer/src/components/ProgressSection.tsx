import { Play, X, RotateCcw, FolderOpen, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import type { ConversionState } from '../types'

const api = window.ffmpegAPI

interface Props {
  conversionState: ConversionState
  outputFile: string
  canConvert: boolean
  showLog: boolean
  onStart: () => void
  onCancel: () => void
  onReset: () => void
  onToggleLog: () => void
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export default function ProgressSection({
  conversionState,
  outputFile,
  canConvert,
  showLog,
  onStart,
  onCancel,
  onReset,
  onToggleLog
}: Props) {
  const { status, progress, error } = conversionState

  const isRunning   = status === 'running'
  const isDone      = status === 'done'
  const isError     = status === 'error'
  const isCancelled = status === 'cancelled'
  const isFinished  = isDone || isError || isCancelled

  const percent = progress?.percent ?? (isDone ? 100 : 0)

  // Bar color
  const barColor =
    isError     ? 'bg-red-500' :
    isCancelled ? 'bg-amber-500' :
    isDone      ? 'bg-green-500' :
                  'bg-violet-500'

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-900">
      {/* Progress bar */}
      {(isRunning || isFinished) && (
        <div className="px-4 pt-3 pb-0">
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>
              {isRunning    && 'Converting…'}
              {isDone       && '✓ Done'}
              {isError      && '✗ Error'}
              {isCancelled  && '⏹ Cancelled'}
            </span>
            <span className="font-mono">{percent.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor} ${isRunning ? 'animate-pulse-bar' : ''}`}
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Stats row */}
          {progress && isRunning && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500 font-mono mt-1.5">
              <span>⏱ {fmtTime(progress.currentSec)} / {fmtTime(progress.totalSec)}</span>
              <span>🎞 {progress.frame} frames</span>
              <span>⚡ {progress.fps} fps</span>
              <span>📦 {progress.size}</span>
              <span>🔗 {progress.bitrate}</span>
              <span>🚀 {progress.speed}</span>
            </div>
          )}

          {isError && error && (
            <div className="flex items-start gap-1.5 mt-1.5 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="break-all font-mono">{error}</span>
            </div>
          )}

          {isDone && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Conversion complete!</span>
            </div>
          )}

          {isCancelled && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Cancelled by user</span>
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        {/* Primary action */}
        {isRunning ? (
          <button className="btn-danger" onClick={onCancel}>
            <X className="w-4 h-4" />
            Cancel
          </button>
        ) : isFinished ? (
          <button className="btn-ghost" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        ) : (
          <button
            className="btn-primary"
            disabled={!canConvert}
            onClick={onStart}
          >
            <Play className="w-4 h-4" />
            Convert
          </button>
        )}

        {/* Open output */}
        {isDone && outputFile && (
          <button
            className="btn-ghost text-green-400 border-green-700/50 hover:border-green-600"
            onClick={() => api.showItemInFolder(outputFile)}
          >
            <FolderOpen className="w-4 h-4" />
            Show in folder
          </button>
        )}

        <div className="flex-1" />

        {/* Toggle log */}
        <button
          className="btn-ghost text-xs py-1 px-3"
          onClick={onToggleLog}
        >
          Log
          {showLog
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronUp className="w-3 h-3" />
          }
        </button>
      </div>
    </div>
  )
}
