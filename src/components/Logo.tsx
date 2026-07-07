// Logo Rioja 25: badge redondeado con degradado + tejado (líneas) sobre el "25".
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex items-center justify-center rounded-[22%] text-white shadow-md"
      style={{ width: size, height: size, background: 'linear-gradient(160deg,#16B478,#0B7E52)' }}
      aria-label="Rioja 25"
    >
      <svg viewBox="0 0 48 20" width={size * 0.62} height={size * 0.26}
        className="absolute" style={{ top: size * 0.16 }} fill="none" stroke="#fff"
        strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 18 24 3.5 43 18" />
        <path d="M36 12v-7" />
      </svg>
      <span className="font-display font-extrabold" style={{ fontSize: size * 0.4, marginTop: size * 0.22 }}>25</span>
    </span>
  )
}
