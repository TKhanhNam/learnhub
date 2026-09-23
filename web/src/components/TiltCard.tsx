import { useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
  to?: string
  className?: string
  style?: CSSProperties
}

/** Light CSS tilt — rAF-throttled to avoid layout thrash on many cards. */
export default function TiltCard({ children, to, className = '', style }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const pending = useRef(false)
  const last = useRef({ rx: 0, ry: 0 })

  const tilt = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const box = el.getBoundingClientRect()
    const x = (e.clientX - box.left) / box.width
    const y = (e.clientY - box.top) / box.height
    last.current = { rx: (0.5 - y) * 10, ry: (x - 0.5) * 12 }
    if (pending.current) return
    pending.current = true
    requestAnimationFrame(() => {
      pending.current = false
      const node = ref.current
      if (!node) return
      const { rx, ry } = last.current
      node.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`
    })
  }

  const reset = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  const inner = (
    <div
      ref={ref}
      className={`card tilt-card ${className}`.trim()}
      style={{ ...style, transformStyle: 'preserve-3d', willChange: 'transform' }}
      onMouseMove={tilt}
      onMouseLeave={reset}
    >
      {children}
    </div>
  )

  if (to) {
    return <Link to={to} style={{ display: 'block' }}>{inner}</Link>
  }
  return inner
}
