import { Suspense, lazy, useEffect, useRef, useState } from 'react'

const BrandOrbs = lazy(() =>
  import('@designcodeio/threeui/components/BrandOrbs').then((m) => ({ default: m.BrandOrbs })),
)

const ORBS = ['react', 'github', 'figma'] as const

/** 3 BrandOrbs only — pause / unmount when off-screen to cut GPU cost. */
export default function OrbsRow() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '40px', threshold: 0.1 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className="orbs-row" aria-hidden="true">
      {visible ? (
        <Suspense fallback={null}>
          {ORBS.map((variant, i) => (
            <div key={variant} className="orbs-row-item" style={{ animationDelay: `${i * 0.12}s` }}>
              <BrandOrbs variant={variant} size="small" mode="light" speed={0.55} paused={!visible} />
            </div>
          ))}
        </Suspense>
      ) : null}
    </div>
  )
}
