/** I soli tipi di file che l'app accetta come allegato: niente SVG né HTML, che possono portare script. */
export const MIME_FOTO = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export const MIME_AMMESSI: readonly string[] = [...MIME_FOTO, 'application/pdf']

export const mimeAmmesso = (m: unknown): m is string => typeof m === 'string' && MIME_AMMESSI.includes(m)
export const mimeFoto = (m: unknown): boolean => typeof m === 'string' && (MIME_FOTO as readonly string[]).includes(m)
