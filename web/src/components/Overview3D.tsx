import TiltCard from './TiltCard'

interface Stat {
  label: string
  value: string
  hint: string
}

export default function Overview3D({ title, subtitle, stats }: {
  title: string
  subtitle?: string
  stats: Stat[]
}) {
  return (
    <section className="overview-3d">
      <div className="overview-3d-copy">
        <h2>{title}</h2>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      <div className="overview-3d-stage">
        {stats.map((stat, i) => (
          <TiltCard key={stat.label} className={`overview-stat n${i + 1}`}>
            <div className="body">
              <span className="muted">{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.hint}</small>
            </div>
          </TiltCard>
        ))}
      </div>
    </section>
  )
}
