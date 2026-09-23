import { Suspense, lazy, useEffect, useRef, useState, type CSSProperties } from 'react'

const PredictiveArcCanvas = lazy(() =>
  import('@designcodeio/threeui/components/PredictiveArcCanvas').then((m) => ({
    default: m.PredictiveArcCanvas,
  })),
)

interface Props {
  className?: string
  style?: CSSProperties
}

/** Single light ambient effect — mounts only when in view. */
export default function ThreeuiBackdrop({ className = '', style }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: '60px', threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={`threeui-backdrop ${className}`.trim()} style={style} aria-hidden="true">
      {active ? (
        <Suspense fallback={null}>
          <PredictiveArcCanvas
            mode="light"
            speed={0.55}
            spacing={1.35}
            dotSize={0.9}
            archHeight={1}
            thickness={0.9}
            brightness={0.95}
            hue={215}
            saturation={1.1}
            className="threeui-backdrop-canvas"
          />
        </Suspense>
      ) : null}
    </div>
  )
}
