import { Video } from 'lucide-react'
import type { AppSettings, Encoder } from '../types'

interface Props {
  settings: AppSettings
  encoders: Encoder[]
  onChange: (partial: Partial<AppSettings>) => void
}

const RESOLUTIONS = [
  { value: 'original',   label: 'Original' },
  { value: '7680x4320', label: '8K (7680×4320)' },
  { value: '3840x2160', label: '4K UHD (3840×2160)' },
  { value: '2560x1440', label: '2K QHD (2560×1440)' },
  { value: '1920x1080', label: '1080p (1920×1080)' },
  { value: '1280x720',  label: '720p (1280×720)' },
  { value: '854x480',   label: '480p (854×480)' },
  { value: '640x360',   label: '360p (640×360)' },
  { value: '426x240',   label: '240p (426×240)' },
  { value: 'custom',    label: 'Custom…' },
]

const FRAME_RATES = [
  { value: 'original', label: 'Original' },
  { value: '120',      label: '120 fps' },
  { value: '60',       label: '60 fps' },
  { value: '50',       label: '50 fps' },
  { value: '30',       label: '30 fps' },
  { value: '25',       label: '25 fps' },
  { value: '24',       label: '24 fps' },
  { value: '23.976',   label: '23.976 fps' },
  { value: '15',       label: '15 fps' },
  { value: 'custom',   label: 'Custom…' },
]

const PIX_FMTS = [
  { value: 'auto',        label: 'Auto' },
  { value: 'yuv420p',     label: 'yuv420p (8-bit, most compatible)' },
  { value: 'yuv422p',     label: 'yuv422p (8-bit)' },
  { value: 'yuv444p',     label: 'yuv444p (8-bit, lossless chroma)' },
  { value: 'yuv420p10le', label: 'yuv420p10le (10-bit)' },
  { value: 'yuv422p10le', label: 'yuv422p10le (10-bit)' },
  { value: 'yuv444p10le', label: 'yuv444p10le (10-bit)' },
  { value: 'nv12',        label: 'nv12 (GPU/VAAPI)' },
  { value: 'p010le',      label: 'p010le (10-bit GPU)' },
  { value: 'rgb8',        label: 'rgb8 (GIF)' },
  { value: 'rgba',        label: 'rgba (PNG/WebP)' },
  { value: 'gray',        label: 'gray (Grayscale 8-bit)' },
]

const PRESETS_LABELS = [
  'ultrafast', 'superfast', 'veryfast', 'faster', 'fast',
  'medium', 'slow', 'slower', 'veryslow', 'placebo'
]

// ─── Codec groups ─────────────────────────────────────────────────────────────

const SPECIAL_VIDEO = [
  { name: 'copy', description: 'Copy stream (no re-encode)' },
]

function groupEncoders(encoders: Encoder[]) {
  const hwKeywords = ['nvenc', 'vaapi', 'qsv', 'amf', 'videotoolbox', 'v4l2m2m', 'mf']
  const hw = encoders.filter((e) => hwKeywords.some((k) => e.name.includes(k)))
  const sw = encoders.filter((e) => !hwKeywords.some((k) => e.name.includes(k)))
  return { sw, hw }
}

export default function VideoSection({ settings, encoders, onChange }: Props) {
  const { sw, hw } = groupEncoders(encoders)

  return (
    <div className="section-card animate-fade-in space-y-0 divide-y divide-zinc-800">
      {/* Header + enable toggle */}
      <div className="section-header justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-violet-400" />
          Video
        </div>
        <label className="flex items-center gap-2 text-xs font-normal text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-3.5 h-3.5 accent-violet-500"
            checked={settings.videoEnabled}
            onChange={(e) => onChange({ videoEnabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>

      {settings.videoEnabled && (
        <div className="p-4 grid grid-cols-2 gap-4">
          {/* Codec */}
          <div className="col-span-2">
            <label className="field-label">Video codec</label>
            <select
              className="field-select"
              value={settings.videoCodec}
              onChange={(e) => onChange({ videoCodec: e.target.value })}
            >
              {SPECIAL_VIDEO.map((c) => (
                <option key={c.name} value={c.name}>{c.name} – {c.description}</option>
              ))}
              {sw.length > 0 && (
                <optgroup label="── Software encoders ──────────────">
                  {sw.map((e) => (
                    <option key={e.name} value={e.name}>
                      {e.name}{e.isExperimental ? ' ⚗' : ''} – {e.description}
                    </option>
                  ))}
                </optgroup>
              )}
              {hw.length > 0 && (
                <optgroup label="── Hardware encoders ──────────────">
                  {hw.map((e) => (
                    <option key={e.name} value={e.name}>
                      {e.name}{e.isExperimental ? ' ⚗' : ''} – {e.description}
                    </option>
                  ))}
                </optgroup>
              )}
              {encoders.length === 0 && (
                <option disabled>Loading encoders…</option>
              )}
            </select>
          </div>

          {settings.videoCodec !== 'copy' && (
            <>
              {/* Quality mode */}
              <div className="col-span-2">
                <label className="field-label">Quality mode</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input
                      type="radio"
                      className="accent-violet-500"
                      checked={settings.videoUseCRF}
                      onChange={() => onChange({ videoUseCRF: true })}
                    />
                    CRF (constant rate factor)
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input
                      type="radio"
                      className="accent-violet-500"
                      checked={!settings.videoUseCRF}
                      onChange={() => onChange({ videoUseCRF: false })}
                    />
                    Bitrate
                  </label>
                </div>
              </div>

              {settings.videoUseCRF ? (
                <div className="col-span-2">
                  <label className="field-label flex justify-between">
                    <span>CRF value <span className="text-zinc-500">(lower = better quality)</span></span>
                    <span className="text-violet-400 font-mono">{settings.videoCRF}</span>
                  </label>
                  <input
                    type="range" min={0} max={63}
                    value={settings.videoCRF}
                    onChange={(e) => onChange({ videoCRF: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-zinc-600 mt-1">
                    <span>0 – Lossless</span>
                    <span>23 – Default</span>
                    <span>63 – Worst</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="field-label">Video bitrate</label>
                  <input
                    className="field-input"
                    placeholder="e.g. 2M, 5000k"
                    value={settings.videoBitrate}
                    onChange={(e) => onChange({ videoBitrate: e.target.value })}
                  />
                </div>
              )}

              {/* Preset */}
              <div>
                <label className="field-label">Preset <span className="text-zinc-600">(speed ↔ quality)</span></label>
                <select
                  className="field-select"
                  value={settings.videoPreset}
                  onChange={(e) => onChange({ videoPreset: e.target.value })}
                >
                  <option value="">— none —</option>
                  {PRESETS_LABELS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Pixel format */}
              <div>
                <label className="field-label">Pixel format</label>
                <select
                  className="field-select"
                  value={settings.pixFmt}
                  onChange={(e) => onChange({ pixFmt: e.target.value })}
                >
                  {PIX_FMTS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Resolution */}
              <div>
                <label className="field-label">Resolution</label>
                <select
                  className="field-select"
                  value={settings.resolution}
                  onChange={(e) => onChange({ resolution: e.target.value })}
                >
                  {RESOLUTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {settings.resolution === 'custom' && (
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Width (px, -2 = auto)</label>
                    <input
                      className="field-input"
                      placeholder="-2"
                      value={settings.customWidth}
                      onChange={(e) => onChange({ customWidth: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Height (px, -2 = auto)</label>
                    <input
                      className="field-input"
                      placeholder="-2"
                      value={settings.customHeight}
                      onChange={(e) => onChange({ customHeight: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Frame rate */}
              <div>
                <label className="field-label">Frame rate</label>
                <select
                  className="field-select"
                  value={settings.frameRate}
                  onChange={(e) => onChange({ frameRate: e.target.value })}
                >
                  {FRAME_RATES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {settings.frameRate === 'custom' && (
                <div>
                  <label className="field-label">Custom fps</label>
                  <input
                    className="field-input"
                    placeholder="e.g. 29.97"
                    value={settings.customFrameRate}
                    onChange={(e) => onChange({ customFrameRate: e.target.value })}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
