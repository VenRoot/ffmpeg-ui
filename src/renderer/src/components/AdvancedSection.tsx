import { Settings2, Info } from 'lucide-react'
import type { AppSettings } from '../types'

interface Props {
  settings: AppSettings
  hwAccels: string[]
  onChange: (partial: Partial<AppSettings>) => void
}

const THREAD_HINTS: Record<number, string> = {
  0: 'Auto (ffmpeg decides)',
  1: 'Single-threaded',
}

export default function AdvancedSection({ settings, hwAccels, onChange }: Props) {
  return (
    <div className="section-card animate-fade-in divide-y divide-zinc-800">
      <div className="section-header">
        <Settings2 className="w-4 h-4 text-violet-400" />
        Advanced
      </div>

      <div className="p-4 space-y-4">
        {/* Hardware acceleration */}
        <div>
          <label className="field-label flex items-center gap-1.5">
            Hardware acceleration
            <span title="Uses GPU-accelerated decoders/encoders when supported" className="text-zinc-600 cursor-help">
              <Info className="w-3 h-3" />
            </span>
          </label>
          <select
            className="field-select"
            value={settings.hwAccel}
            onChange={(e) => onChange({ hwAccel: e.target.value })}
          >
            <option value="none">None (software)</option>
            <option value="auto">Auto-detect</option>
            <optgroup label="── Detected on this system ──────────">
              {hwAccels.map((a) => (
                <option key={a} value={a}>{a.toUpperCase()}</option>
              ))}
              {hwAccels.length === 0 && (
                <option disabled>None detected</option>
              )}
            </optgroup>
            <optgroup label="── Manual override ─────────────────">
              {['cuda', 'vaapi', 'qsv', 'amf', 'videotoolbox', 'd3d11va', 'dxva2', 'vulkan']
                .filter((h) => !hwAccels.includes(h))
                .map((h) => (
                  <option key={h} value={h}>{h.toUpperCase()}</option>
                ))}
            </optgroup>
          </select>
          {settings.hwAccel === 'vaapi' && (
            <p className="text-xs text-zinc-500 mt-1">
              VAAPI device: <code className="text-violet-400">/dev/dri/renderD128</code> (added automatically)
            </p>
          )}
        </div>

        {/* Threads */}
        <div>
          <label className="field-label flex justify-between">
            <span>CPU threads</span>
            <span className="font-mono text-violet-400">
              {settings.threads === 0 ? 'Auto' : settings.threads}
            </span>
          </label>
          <input
            type="range" min={0} max={32} step={1}
            value={settings.threads}
            onChange={(e) => onChange({ threads: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>0 – Auto</span>
            <span>16</span>
            <span>32</span>
          </div>
          {THREAD_HINTS[settings.threads] && (
            <p className="text-xs text-zinc-500 mt-1">{THREAD_HINTS[settings.threads]}</p>
          )}
        </div>

        {/* Extra input args */}
        <div>
          <label className="field-label flex items-center gap-1.5">
            Extra input arguments
            <span title="Added before -i" className="text-zinc-600 cursor-help"><Info className="w-3 h-3" /></span>
          </label>
          <input
            className="field-input font-mono text-xs"
            placeholder="-fflags +genpts -r 30"
            value={settings.extraInputArgs}
            onChange={(e) => onChange({ extraInputArgs: e.target.value })}
          />
          <p className="text-xs text-zinc-600 mt-1">Placed before the <code className="text-violet-400">-i</code> flag</p>
        </div>

        {/* Extra output args */}
        <div>
          <label className="field-label flex items-center gap-1.5">
            Extra output arguments
            <span title="Added before output file" className="text-zinc-600 cursor-help"><Info className="w-3 h-3" /></span>
          </label>
          <input
            className="field-input font-mono text-xs"
            placeholder="-map 0 -metadata title=&quot;My Video&quot;"
            value={settings.extraOutputArgs}
            onChange={(e) => onChange({ extraOutputArgs: e.target.value })}
          />
          <p className="text-xs text-zinc-600 mt-1">Placed before the output filename</p>
        </div>

        {/* Tips */}
        <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/40 p-3 text-xs text-zinc-500 space-y-1">
          <p className="font-medium text-zinc-400">Common extra args</p>
          <p><code className="text-violet-400">-map 0</code> – Include all streams</p>
          <p><code className="text-violet-400">-movflags +faststart</code> – Web-optimized MP4</p>
          <p><code className="text-violet-400">-metadata title="My Video"</code> – Set metadata</p>
          <p><code className="text-violet-400">-tune film</code> – libx264 film tune</p>
          <p><code className="text-violet-400">-profile:v high</code> – H.264 high profile</p>
        </div>
      </div>
    </div>
  )
}
