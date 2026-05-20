// ============================================================================
// CoinIcon — goldene Münze mit € Symbol
// 
// Wiederverwendbar in Header, Profil-Detail, Inbox-Composer.
// Konsistentes Visual für alle Coin-Anzeigen.
// ============================================================================

interface CoinIconProps {
  size?: number;
  className?: string;
}

export default function CoinIcon({ size = 16, className = '' }: CoinIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="50%" stopColor="#FFC107" />
          <stop offset="100%" stopColor="#F9A825" />
        </linearGradient>
        <linearGradient id="coinInner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD54F" />
          <stop offset="100%" stopColor="#FFA000" />
        </linearGradient>
      </defs>
      {/* Äußerer Ring */}
      <circle cx="12" cy="12" r="11" fill="url(#coinGradient)" />
      {/* Innerer Bereich (leicht abgesetzt) */}
      <circle cx="12" cy="12" r="8.5" fill="url(#coinInner)" />
      {/* Glanzpunkt oben links für 3D-Effekt */}
      <ellipse cx="9" cy="8" rx="3" ry="2" fill="#FFF8E1" opacity="0.5" />
      {/* € Symbol */}
      <text
        x="12"
        y="16"
        fontSize="11"
        fontWeight="900"
        textAnchor="middle"
        fill="#8B4513"
        fontFamily="Arial, sans-serif"
        style={{ letterSpacing: '-0.5px' }}
      >
        €
      </text>
    </svg>
  );
}
