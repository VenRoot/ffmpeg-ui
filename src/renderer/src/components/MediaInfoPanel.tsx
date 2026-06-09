import { Info, Video, Music } from 'lucide-react'
import type { FFprobeOutput } from '../types'

interface Props {
  info: FFprobeOutput
}

function fmtSize(bytes: string | undefined): string {
  if (!bytes) return '—'
  const b = parseInt(bytes)
  if (b > 1e9) return `${(b / 1e9).toFixed(2)} GB`
  if (b > 1e6) return `${(b / 1e6).toFixed(2)} MB`
  return `${(b / 1e3).toFixed(1)} KB`
}

function fmtDuration(dur: string | undefined): string {
  if (!dur) return '—'
  const sec = parseFloat(dur)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = (sec % 60).toFixed(2)
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(+s < 10 ? '0' : '') + s}`
    : `${String(m).padStart(2,'0')}:${String(+s < 10 ? '0' : '') + s}`
}

function fmtBitrate(br: string | undefined): string {
  if (!br) return '—'
  const k = parseInt(br) / 1000
  return k > 1000 ? `${(k / 1000).toFixed(1)} Mb/s` : `${k.toFixed(0)} kb/s`
}

function fmtFps(rate: string | undefined): string {
  if (!rate) return '—'
  const [n, d] = rate.split('/').map(Number)
  if (!d) return rate
  const fps = n / d
  return fps % 1 === 0 ? `${fps} fps` : `${fps.toFixed(3)} fps`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-zinc-500 w-28 shrink-0">{label}</span>
      <span className="text-zinc-300 font-mono break-all">{value}</span>
    </div>
  )
}

export default function MediaInfoPanel({ info }: Props) {
  const { format, streams } = info
  const videoStreams = streams.filter((s) => s.codec_type === 'video')
  const audioStreams = streams.filter((s) => s.codec_type === 'audio')
  const title = format.tags?.title

  return (
    <div className="section-card animate-fade-in divide-y divide-zinc-800">
      <div className="section-header">
        <Info className="w-4 h-4 text-violet-400" />
        Media Info
        {title && <span className="text-zinc-500 font-normal ml-1">– {title}</span>}
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {/* Container */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Container</p>
          <Row label="Format"    value={format.format_long_name ?? format.format_name} />
          <Row label="Duration"  value={fmtDuration(format.duration)} />
          <Row label="File size" value={fmtSize(format.size)} />
          <Row label="Bitrate"   value={fmtBitrate(format.bit_rate)} />
          <Row label="Streams"   value={String(format.nb_streams)} />
        </div>

        {/* Video streams */}
        {videoStreams.map((s, i) => (
          <div key={s.index} className="space-y-1">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Video className="w-3 h-3" /> Video {videoStreams.length > 1 ? i + 1 : ''}
            </p>
            <Row label="Codec"      value={`${s.codec_name ?? '—'} (${s.profile ?? '—'})`} />
            <Row label="Resolution" value={s.width && s.height ? `${s.width} × ${s.height}` : '—'} />
            <Row label="Frame rate" value={fmtFps(s.r_frame_rate)} />
            <Row label="Pix fmt"    value={s.pix_fmt ?? '—'} />
            <Row label="Bitrate"    value={fmtBitrate(s.bit_rate)} />
          </div>
        ))}

        {/* Audio streams */}
        {audioStreams.map((s, i) => (
          <div key={s.index} className="space-y-1">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Music className="w-3 h-3" /> Audio {audioStreams.length > 1 ? i + 1 : ''}
              {s.tags?.language && <span className="text-zinc-600 normal-case font-normal">({s.tags.language})</span>}
            </p>
            <Row label="Codec"       value={s.codec_long_name ?? s.codec_name ?? '—'} />
            <Row label="Sample rate" value={s.sample_rate ? `${s.sample_rate} Hz` : '—'} />
            <Row label="Channels"    value={s.channel_layout ?? (s.channels ? String(s.channels) : '—')} />
            <Row label="Bitrate"     value={fmtBitrate(s.bit_rate)} />
          </div>
        ))}
      </div>
    </div>
  )
}
