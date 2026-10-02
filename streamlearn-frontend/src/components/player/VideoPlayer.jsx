import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

export default function VideoPlayer({ src, poster, onProgress, onEnded, startTime = 0, options = {} }) {
  const videoRef = useRef(null)
  const playerRef = useRef(null)
  const hlsRef    = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!src || !videoRef.current) return

    // Use HLS.js for adaptive streaming
    if (src.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      })
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(videoRef.current)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (startTime > 0) videoRef.current.currentTime = startTime
        videoRef.current.play().catch(() => {})
      })
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setError('Stream error. Please try again.')
      })
    } else {
      videoRef.current.src = src
      if (startTime > 0) videoRef.current.currentTime = startTime
      videoRef.current.play().catch(() => {})
    }

    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [src])

  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (v) onProgress?.({ currentTime: v.currentTime, duration: v.duration })
  }

  if (error) return (
    <div className="aspect-video bg-black flex items-center justify-center text-red-400 text-sm">{error}</div>
  )

  return (
    <div className="relative bg-black aspect-video w-full">
      <video
        ref={videoRef}
        poster={poster}
        controls
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onEnded={onEnded}
        {...options}
      />
    </div>
  )
}
