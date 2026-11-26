type SealProps = {
  text: string
  color: string
  size?: number
}

export function Seal({ text, color, size = 40 }: SealProps) {
  const char = Array.from(text.trim())[0] ?? '记'
  return (
    <span
      className="seal"
      style={{ background: color, width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {char}
    </span>
  )
}
