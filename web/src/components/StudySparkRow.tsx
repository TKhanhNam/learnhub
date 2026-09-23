const CHIPS = [
  { label: 'Lập trình', tone: 't1' },
  { label: 'Thiết kế', tone: 't2' },
  { label: 'Kinh doanh', tone: 't3' },
  { label: 'Ngoại ngữ', tone: 't4' },
] as const

/** Lightweight learning chips — replaces heavy BrandOrbs iframes. */
export default function StudySparkRow() {
  return (
    <div className="study-spark-row" aria-hidden="true">
      {CHIPS.map((c, i) => (
        <div key={c.label} className={`study-spark-chip ${c.tone}`} style={{ animationDelay: `${i * 0.14}s` }}>
          <span className="study-spark-orb" />
          <span>{c.label}</span>
        </div>
      ))}
    </div>
  )
}
