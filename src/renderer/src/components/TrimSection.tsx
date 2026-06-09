import { Scissors, Info } from 'lucide-react'
import type { AppSettings, FFprobeOutput } from '../types'

interface Props {
  settings: AppSettings
  mediaInfo: FFprobeOutput | null
  onChange: (partial: Partial<AppSettings>) => void
}

function secToHms(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${s.toFixed(2).padStart(5,'0')}`
}

function hmsSec(hms: string): number {
  const parts = hms.split(':').map(parseFloat)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] ?? 0
}

/** Duration between start and end times, as HH:MM:SS.ms */
function calcDuration(start: string, end: string): string {
  if (!start && !end) return ''
  const s = start ? hmsSec(start) : 0
  const e = end ? hmsSec(end) : 0
  if (!end) return ''
  const dur = Math.max(0, e - s)
  return secToHms(dur)
}

const QUICK_CLIPS = [
  { label: 'First 30 s', start: '00:00:00', end: '00:00:30' },
  { label: 'First 60 s', start: '00:00:00', end: '00:01:00' },
  { label: 'First 5 min', start: '00:00:00', end: '00:05:00' },
]

export default function TrimSection({ settings, mediaInfo, onChange }: Props) {
  const totalSec = mediaInfo?.format?.duration
    ? parseFloat(mediaInfo.format.duration)
    : null

  const duration = calcDuration(settings.startTime, settings.endTime)

  return (
    <div className="section-card animate-fade-in divide-y divide-zinc-800">
      <div className="section-header">
        <Scissors className="w-4 h-4 text-violet-400" />
        Trim / Cut
      </div>

      <div className="p-4 space-y-4">
        {/* Time inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Start time</label>
            <input
              className="field-input font-mono"
              placeholder="HH:MM:SS.ms  (blank = start)"
              value={settings.startTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">End time</label>
            <input
              className="field-input font-mono"
              placeholder="HH:MM:SS.ms  (blank = end)"
              value={settings.endTime}
              onChange={(e) => onChange({ endTime: e.target.value })}
            />
          </div>
        </div>

        {/* Duration display */}
        {(settings.startTime || settings.endTime) && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Info className="w-3.5 h-3.5 shrink-0 text-zinc-600" />
            {duration
              ? <>Clip duration: <span className="font-mono text-violet-400 ml-1">{duration}</span></>
              : 'Enter end time to calculate duration'
            }
            {totalSec && (
              <span className="text-zinc-600 ml-2">
                / total {secToHms(totalSec)}
              </span>
            )}
          </div>
        )}

        {/* Quick clip buttons */}
        <div>
          <label className="field-label">Quick clips</label>
          <div className="flex flex-wrap gap-2">
            {QUICK_CLIPS.map((c) => (
              <button
                key={c.label}
                className="btn-ghost text-xs py-1"
                onClick={() => onChange({ startTime: c.start, endTime: c.end })}
              >
                {c.label}
              </button>
            ))}
            {totalSec && (
              <button
                className="btn-ghost text-xs py-1"
                onClick={() => onChange({
                  startTime: secToHms(Math.max(0, totalSec - 30)),
                  endTime: secToHms(totalSec)
                })}
              >
                Last 30 s
              </button>
            )}
            <button
              className="btn-ghost text-xs py-1 text-zinc-500"
              onClick={() => onChange({ startTime: '', endTime: '' })}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Seek mode */}
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-3 space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="mt-0.5 accent-violet-500"
              checked={settings.seekFast}
              onChange={(e) => onChange({ seekFast: e.target.checked })}
            />
            <div>
              <div className="text-sm text-zinc-200 font-medium">Fast seek (keyframe-accurate)</div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Places <code className="text-violet-400">-ss</code> before <code className="text-violet-400">-i</code>.
                Much faster but may start a few frames off. Uncheck for frame-accurate seek (slower).
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
