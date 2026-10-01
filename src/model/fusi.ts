const formati = new Map<string, Intl.DateTimeFormat>()

function formato(fuso: string): Intl.DateTimeFormat {
  let f = formati.get(fuso)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: fuso,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
    formati.set(fuso, f)
  }
  return f
}

/** Vero se `fuso` è un nome IANA che il telefono conosce ("Asia/Tokyo"). */
export function fusoValido(fuso: unknown): fuso is string {
  if (typeof fuso !== 'string' || fuso === '') return false
  try {
    formato(fuso)
    return true
  } catch {
    return false
  }
}

/** "YYYY-MM-DDTHH:MM" che l'orologio del fuso segna nell'istante `d`. */
export function localeDaUtc(d: Date, fuso: string): string {
  const parti = formato(fuso).formatToParts(d)
  const p = (tipo: string) => parti.find(x => x.type === tipo)!.value
  return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}`
}

function msDaLocale(locale: string): number {
  const [data, ora] = locale.split('T')
  const [a, m, g] = data.split('-').map(Number)
  const [h, min] = ora.split(':').map(Number)
  return Date.UTC(a, m - 1, g, h, min)
}

/** L'istante in cui l'orologio del fuso segna `locale` ("2027-08-07T12:30"). Niente tabelle: lo scarto lo dà Intl. */
export function utcDaLocale(locale: string, fuso: string): Date {
  const voluto = msDaLocale(locale)
  let t = voluto
  // Due passi bastano anche a cavallo del cambio dell'ora legale.
  for (let i = 0; i < 2; i++) t += voluto - msDaLocale(localeDaUtc(new Date(t), fuso))
  return new Date(t)
}
