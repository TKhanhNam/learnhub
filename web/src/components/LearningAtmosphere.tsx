/** Ambient learning-themed backdrop — CSS only, no WebGL. */
export default function LearningAtmosphere() {
  return (
    <div className="learn-atmosphere" aria-hidden="true">
      <div className="learn-atmosphere-mesh" />
      <div className="learn-atmosphere-grid" />
      <div className="learn-blob b1" />
      <div className="learn-blob b2" />
      <div className="learn-blob b3" />
      <div className="learn-orbit o1" />
      <div className="learn-orbit o2" />
      <svg className="learn-deco deco-book" viewBox="0 0 64 64" fill="none">
        <path d="M10 14h20c6 0 10 3 10 8v28c0-4-4-6-10-6H10V14z" stroke="currentColor" strokeWidth="2" />
        <path d="M54 14H34c-6 0-10 3-10 8v28c0-4 4-6 10-6h20V14z" stroke="currentColor" strokeWidth="2" />
        <path d="M32 22v28" stroke="currentColor" strokeWidth="2" />
      </svg>
      <svg className="learn-deco deco-cap" viewBox="0 0 64 64" fill="none">
        <path d="M8 26l24-12 24 12-24 12L8 26z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M16 32v10c6 5 26 5 32 0V32" stroke="currentColor" strokeWidth="2" />
        <path d="M56 26v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="learn-spark s1" />
      <div className="learn-spark s2" />
      <div className="learn-spark s3" />
      <div className="learn-spark s4" />
    </div>
  )
}
