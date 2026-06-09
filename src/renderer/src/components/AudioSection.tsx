import { Music } from 'lucide-react'
import type { AppSettings, Encoder } from '../types'

interface Props {
  settings: AppSettings
  encoders: Encoder[]
  onChange: (partial: Partial<AppSettings>) => void
}

const BITRATES = [
  { value: '64k',  label: '64k  – Voice / low quality' },
  { value: '96k',  label: '96k' },
  { value: '128k', label: '128k – Standard' },
  { value: '160k', label: '160k' },
  { value: '192k', label: '192k – Good quality (default)' },
  { value: '256k', label: '256k – High quality' },
  { value: '320k', label: '320k – Maximum MP3 quality' },
]

const SAMPLE_RATES = [
  { value: 'original', label: 'Original' },
  { value: '22050',    label: '22050 Hz' },
  { value: '44100',    label: '44100 Hz (CD)' },
  { value: '48000',    label: '48000 Hz (Professional)' },
  { value: '96000',    label: '96000 Hz (Hi-Res)' },
  { value: '192000',   label: '192000 Hz (Hi-Res)' },
]

const CHANNELS = [
  { value: 'original', label: 'Original' },
  { value: '1',        label: '1 – Mono' },
  { value: '2',        label: '2 – Stereo' },
  { value: '6',        label: '6 – 5.1 Surround' },
  { value: '8',        label: '8 – 7.1 Surround' },
]

const SPECIAL_AUDIO = [
  { name: 'copy', description: 'Copy stream (no re-encode)' },
]

function groupEncoders(encoders: Encoder[]) {
  const lossless = ['flac', 'alac', 'pcm', 'wavpack', 'mlp', 'truehd']
  const ll = encoders.filter((e) => lossless.some((k) => e.name.startsWith(k)))
  const lossy = encoders.filter((e) => !lossless.some((k) => e.name.startsWith(k)))
  return { lossy, lossless: ll }
}

export default function AudioSection({ settings, encoders, onChange }: Props) {
  const { lossy, lossless } = groupEncoders(encoders)

  return (
    <div className="section-card animate-fade-in divide-y divide-zinc-800">
      <div className="section-header justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-violet-400" />
          Audio
        </div>
        <label className="flex items-center gap-2 text-xs font-normal text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-3.5 h-3.5 accent-violet-500"
            checked={settings.audioEnabled}
            onChange={(e) => onChange({ audioEnabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>

      {settings.audioEnabled && (
        <div className="p-4 grid grid-cols-2 gap-4">
          {/* Codec */}
          <div className="col-span-2">
            <label className="field-label">Audio codec</label>
            <select
              className="field-select"
              value={settings.audioCodec}
              onChange={(e) => onChange({ audioCodec: e.target.value })}
            >
              {SPECIAL_AUDIO.map((c) => (
                <option key={c.name} value={c.name}>{c.name} – {c.description}</option>
              ))}
              {lossy.length > 0 && (
                <optgroup label="── Lossy encoders ──────────────────">
                  {lossy.map((e) => (
                    <option key={e.name} value={e.name}>
                      {e.name}{e.isExperimental ? ' ⚗' : ''} – {e.description}
                    </option>
                  ))}
                </optgroup>
              )}
              {lossless.length > 0 && (
                <optgroup label="── Lossless encoders ───────────────">
                  {lossless.map((e) => (
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

          {settings.audioCodec !== 'copy' && (
            <>
              {/* Bitrate */}
              <div>
                <label className="field-label">Bitrate</label>
                <select
                  className="field-select"
                  value={BITRATES.some(b => b.value === settings.audioBitrate)
                    ? settings.audioBitrate : 'custom'}
                  onChange={(e) => {
                    if (e.target.value !== 'custom') onChange({ audioBitrate: e.target.value })
                  }}
                >
                  {BITRATES.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                  <option value="custom">Custom…</option>
                </select>
              </div>

              <div>
                <label className="field-label">Custom bitrate</label>
                <input
                  className="field-input"
                  placeholder="e.g. 192k, 1.5M"
                  value={settings.audioBitrate}
                  onChange={(e) => onChange({ audioBitrate: e.target.value })}
                />
              </div>

              {/* Sample rate */}
              <div>
                <label className="field-label">Sample rate</label>
                <select
                  className="field-select"
                  value={settings.sampleRate}
                  onChange={(e) => onChange({ sampleRate: e.target.value })}
                >
                  {SAMPLE_RATES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Channels */}
              <div>
                <label className="field-label">Channels</label>
                <select
                  className="field-select"
                  value={settings.channels}
                  onChange={(e) => onChange({ channels: e.target.value })}
                >
                  {CHANNELS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Volume */}
              <div className="col-span-2">
                <label className="field-label flex justify-between">
                  <span>Volume</span>
                  <span className="font-mono text-violet-400">{settings.audioVolume}%</span>
                </label>
                <input
                  type="range" min={0} max={300} step={1}
                  value={settings.audioVolume}
                  onChange={(e) => onChange({ audioVolume: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-zinc-600 mt-1">
                  <span>0%</span>
                  <span>100% – Original</span>
                  <span>300% – 3× boost</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
