import { useState } from 'react'
import { favorites, toggleFavorite } from '../lib/buyerStore'

export default function FavButton({ slug }: { slug: string }) {
  const [on, setOn] = useState(() => favorites().includes(slug))
  return (
    <button
      type="button"
      className={on ? 'fav-btn on' : 'fav-btn'}
      aria-pressed={on}
      aria-label="Yêu thích"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setOn(toggleFavorite(slug).includes(slug))
      }}
    >
      {on ? '♥' : '♡'}
    </button>
  )
}
