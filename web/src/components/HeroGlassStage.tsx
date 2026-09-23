import { useEffect, useRef } from 'react'

/**
 * Learning glass accents — sits in a dock below the mosaic so course tiles stay clear.
 */
export default function HeroGlassStage() {
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    let raf = 0
    let tx = 0
    let ty = 0
    let x = 0
    let y = 0

    const onMove = (e: PointerEvent) => {
      const box = stage.getBoundingClientRect()
      tx = ((e.clientX - box.left) / box.width - 0.5) * 2
      ty = ((e.clientY - box.top) / box.height - 0.5) * 2
    }

    const tick = () => {
      x += (tx - x) * 0.07
      y += (ty - y) * 0.07
      stage.style.setProperty('--px', x.toFixed(3))
      stage.style.setProperty('--py', y.toFixed(3))
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <div ref={stageRef} className="hero-glass-dock" aria-hidden="true">
      <div className="hero-glass-dock-glow" />

      <div className="hero-glass-panel p1">
        <span className="hero-glass-label">Ghi chú</span>
        <div className="hero-glass-lines" />
      </div>

      <div className="hero-crystal">
        <div className="hero-glass-rings" />
        <svg viewBox="0 0 200 200" className="hero-crystal-svg">
          <defs>
            <linearGradient id="crystalFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="55%" stopColor="rgba(96,165,250,0.35)" />
              <stop offset="100%" stopColor="rgba(37,99,235,0.45)" />
            </linearGradient>
            <linearGradient id="crystalStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <polygon
            points="100,18 162,52 178,118 128,172 72,172 22,118 38,52"
            fill="url(#crystalFill)"
            stroke="url(#crystalStroke)"
            strokeWidth="1.6"
          />
          <polygon points="100,18 162,52 100,100" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" />
          <polygon points="100,18 38,52 100,100" fill="rgba(147,197,253,0.22)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
          <polygon points="162,52 178,118 100,100" fill="rgba(37,99,235,0.18)" stroke="rgba(191,219,254,0.5)" strokeWidth="0.8" />
          <polygon points="38,52 22,118 100,100" fill="rgba(59,130,246,0.16)" stroke="rgba(191,219,254,0.4)" strokeWidth="0.8" />
          <line x1="100" y1="100" x2="100" y2="172" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
        </svg>
      </div>

      <div className="hero-glass-panel p2">
        <span className="hero-glass-label">Bài học</span>
        <div className="hero-glass-bars">
          <i /><i /><i />
        </div>
      </div>

      <div className="hero-glass-panel p3">
        <span className="hero-glass-label">Chứng chỉ</span>
        <div className="hero-glass-badge" />
      </div>
    </div>
  )
}
