import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export type PaperItem = { title: string; meta?: string; price: string }
export type PaperLine = { label: string; value: string; tone?: 'discount' }

/** Everything the 3D sheet knows how to print. */
export type CartPaperData = {
  wordmark: string
  brand: string
  title: string
  subtitle: string
  buyerLabel: string
  buyer: string
  note: string
  itemsLabel: string
  priceLabel: string
  items: PaperItem[]
  moreText: string
  emptyText: string
  lines: PaperLine[]
  totalLabel: string
  total: string
  issued: string
  signer: string
  signerRole: string
  sealMark: string
  sealSub: string
  /** Fraction of the visible width to slide the sheet by, so the overlay clears it. */
  shift?: number
}

/** How far left the sheet moves once the parchment plaque is docked over it. */
const PANEL_SHIFT = -0.18
const WIDE_ENOUGH = '(min-width: 1000px)'

declare global {
  interface Window {
    __LEARNHUB_CART_PAPER__?: CartPaperData
  }
}

/**
 * ThreeDPaper "certificate" variant (ThreeUI / Three.js r149 + custom GLSL),
 * served same-origin from /landing-pages so the sheet can print the live cart.
 */
export default function CartPaper({
  data,
  hint,
  children,
}: {
  data: CartPaperData
  hint?: string
  children?: ReactNode
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(WIDE_ENOUGH).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(WIDE_ENOUGH)
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const docked = !!children && wide
  const payload = useMemo<CartPaperData>(
    () => ({ ...data, shift: docked ? PANEL_SHIFT : 0 }),
    [data, docked],
  )

  // Redrawing the sheet rebuilds a 1400x1932 canvas texture, so only push a
  // new payload when the printed content actually changed.
  const signature = useMemo(() => JSON.stringify(payload), [payload])

  // Same-origin iframe reads this during boot — set synchronously before paint.
  if (typeof window !== 'undefined') {
    window.__LEARNHUB_CART_PAPER__ = payload
  }

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'learnhub-cart-paper-ready') setReady(true)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    if (!ready) return
    frameRef.current?.contentWindow?.postMessage(
      { type: 'learnhub-cart-paper', payload: JSON.parse(signature) },
      '*',
    )
  }, [signature, ready])

  return (
    <div className="shader-frame cart-paper-frame">
      <iframe
        ref={frameRef}
        title="Phiếu thanh toán LearnHub 3D"
        src="/landing-pages/cart-certificate.html?v=light"
        loading="eager"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 0,
          background: '#e8f0ff',
          opacity: ready ? 1 : 0,
          transition: 'opacity 240ms ease-out',
        }}
      />
      {!ready && <div className="cart-paper-loading">{hint || 'Đang in tờ phiếu 3D…'}</div>}
      {children}
    </div>
  )
}
