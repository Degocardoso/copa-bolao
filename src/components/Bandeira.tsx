'use client';

// Converte um emoji de bandeira (ex: 🇧🇷) no código de país (ex: 'br').
// Emojis de bandeira são 2 "indicadores regionais"; cada um é uma letra.
function emojiParaCodigo(emoji: string): string | null {
  if (!emoji) return null;
  const pontos = Array.from(emoji).map((c) => c.codePointAt(0) || 0);
  // indicadores regionais vão de 0x1F1E6 (A) a 0x1F1FF (Z)
  const letras = pontos
    .filter((p) => p >= 0x1f1e6 && p <= 0x1f1ff)
    .map((p) => String.fromCharCode(p - 0x1f1e6 + 65)); // -> 'A'..'Z'
  if (letras.length === 2) return letras.join('').toLowerCase();
  return null; // bandeiras especiais (Inglaterra, País de Gales) caem no fallback
}

export default function Bandeira({
  emoji,
  tamanho = 30,
}: {
  emoji: string | null | undefined;
  tamanho?: number;
}) {
  const codigo = emojiParaCodigo(emoji || '');

  // sem código (marcador ⏳, bandeira especial, etc.) -> mostra o próprio emoji
  if (!codigo) {
    return (
      <span style={{ fontSize: tamanho, lineHeight: 1 }}>
        {emoji || '🏳️'}
      </span>
    );
  }

  const largura = Math.round(tamanho * 1.35);
  // flagcdn entrega imagens reais de bandeira, funcionam em qualquer sistema
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w80/${codigo}.png`}
      srcSet={`https://flagcdn.com/w160/${codigo}.png 2x`}
      alt=""
      width={largura}
      height={tamanho}
      style={{
        width: largura,
        height: tamanho,
        objectFit: 'cover',
        borderRadius: 4,
        display: 'block',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }}
      loading="lazy"
    />
  );
}
