/** Bridge-themed logo: four suit symbols in a card-inspired shape */
export default function BridgeLogo({ className = '', size = 48 }) {
  const w = size * 1.6
  const h = size
  const positions = [0.2, 0.4, 0.6, 0.8]
  const suits = [
    { char: '♠', fill: 'var(--bridge-black, #1a1a1a)' },
    { char: '♥', fill: 'var(--bridge-red, #b91c1c)' },
    { char: '♦', fill: 'var(--bridge-red, #b91c1c)' },
    { char: '♣', fill: 'var(--bridge-black, #1a1a1a)' },
  ]
  return (
    <svg
      className={className}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="1"
        y="1"
        width={w - 2}
        height={h - 2}
        rx="8"
        fill="var(--bridge-white, #fff)"
        stroke="var(--bridge-green, #1b4d3e)"
        strokeWidth="2"
      />
      {suits.map((suit, i) => (
        <text
          key={suit.char}
          x={w * positions[i]}
          y={h / 2 + 6}
          textAnchor="middle"
          fontSize={size * 0.38}
          fill={suit.fill}
          fontWeight="bold"
        >
          {suit.char}
        </text>
      ))}
    </svg>
  )
}
