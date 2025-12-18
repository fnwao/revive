// Acquiri AI Logo Component - Stylized "A" with dynamic swoosh
export function AcquiriLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="acquiriGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(217, 91%, 70%)" />
          <stop offset="50%" stopColor="hsl(217, 91%, 60%)" />
          <stop offset="100%" stopColor="hsl(217, 91%, 50%)" />
        </linearGradient>
        <linearGradient id="acquiriShadow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(217, 91%, 50%)" />
          <stop offset="100%" stopColor="hsl(217, 91%, 40%)" />
        </linearGradient>
        <linearGradient id="acquiriHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(217, 91%, 80%)" />
          <stop offset="100%" stopColor="hsl(217, 91%, 70%)" />
        </linearGradient>
      </defs>
      
      {/* Left leg of A - straight and angled */}
      <path
        d="M 20 85 L 32 30 L 38 30 L 26 85 Z"
        fill="url(#acquiriGradient)"
      />
      
      {/* Right leg of A - curves inward then sweeps out dramatically */}
      <path
        d="M 50 30 L 62 30 L 75 85 L 70 85 L 60 40 L 58 40 L 50 85 Z"
        fill="url(#acquiriGradient)"
      />
      
      {/* Crossbar of A */}
      <path
        d="M 28 58 L 70 58 L 68 53 L 30 53 Z"
        fill="url(#acquiriGradient)"
      />
      
      {/* Dramatic swoosh/arrow extension on right - curves outward and points right */}
      <path
        d="M 70 85 L 75 85 Q 85 75 95 50 Q 105 25 110 15 L 105 10 Q 100 20 90 45 Q 80 70 72 80 Z"
        fill="url(#acquiriShadow)"
        opacity="0.85"
      />
      
      {/* Additional swoosh detail for depth */}
      <path
        d="M 75 85 Q 88 70 100 40 Q 108 20 112 12"
        stroke="url(#acquiriShadow)"
        strokeWidth="2"
        fill="none"
        opacity="0.6"
      />
      
      {/* Highlight on left leg for 3D effect */}
      <path
        d="M 22 83 L 28 45 L 26 43 L 20 81 Z"
        fill="url(#acquiriHighlight)"
        opacity="0.7"
      />
      
      {/* Highlight on crossbar */}
      <path
        d="M 30 56 L 68 56 L 67 54 L 31 54 Z"
        fill="url(#acquiriHighlight)"
        opacity="0.5"
      />
    </svg>
  )
}
