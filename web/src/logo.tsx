/**
 * Marca do Radar: tela de radar (dois anéis), varredura e um ponto encontrado.
 * Usa currentColor para herdar a cor da cidade; desenhada em grade de 32 para ler bem a 16px (favicon).
 */
export function LogoMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className} fill="none">
      <path d="M16 16 L16 3 A13 13 0 0 1 27.26 9.5 Z" fill="currentColor" opacity=".28" />
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="16" cy="16" r="6.5" stroke="currentColor" strokeWidth="2.6" />
      <path d="M16 16 L27.26 9.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="20.5" cy="8.2" r="2.6" fill="currentColor" />
    </svg>
  )
}
