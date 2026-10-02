import sharp from 'sharp'

// Due disegni semplici sul fondo Washi: un sole per "Oggi", un portafoglio col "+" per "Aggiungi spesa".
const SFONDO = '#F6F1E7'
const ROSSO = '#C8452C'
const INCHIOSTRO = '#1D1B18'
const ICONE: Record<string, string> = {
  'scorciatoia-oggi': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="${SFONDO}"/><circle cx="48" cy="48" r="16" fill="${ROSSO}"/><path d="M48 14v10M48 72v10M14 48h10M72 48h10M24 24l7 7M65 65l7 7M24 72l7-7M65 31l7-7" stroke="${ROSSO}" stroke-width="6" stroke-linecap="round"/></svg>`,
  'scorciatoia-spesa': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="${SFONDO}"/><rect x="14" y="26" width="56" height="42" rx="8" fill="none" stroke="${INCHIOSTRO}" stroke-width="6"/><circle cx="70" cy="66" r="17" fill="${ROSSO}"/><path d="M70 57v18M61 66h18" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/></svg>`,
}

for (const [nome, svg] of Object.entries(ICONE)) {
  const file = `public/${nome}-96.png`
  await sharp(Buffer.from(svg)).resize(96, 96).png().toFile(file)
  console.log(file)
}
