import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatoData } from '../../model/date'
import { descriviQuando } from '../../model/prenotazioni'
import { cerca } from '../../model/ricerca'
import { cittaDi } from '../../model/riepilogo'
import { useViaggio } from '../../store/viaggio'
import { Gruppo, Riga } from '../../ui/componenti'
import { Foglio } from '../../ui/Foglio'
import { ICONA_PRENOTAZIONE, ICONA_TIPO } from '../../ui/icone'
import { hrefDocumento } from '../../ui/rotta'
import { FoglioTappa } from '../programma/FoglioTappa'

interface Props { aperto: boolean; onChiudi: () => void; onTappa: (giornoId: string, tappaId: string) => void }

/** Cerca in tappe e prenotazioni; maiuscole e accenti non contano. I risultati aprono il dettaglio. */
function FoglioRicerca({ aperto, onChiudi, onTappa }: Props) {
  const viaggio = useViaggio(s => s.viaggio)
  const [testo, setTesto] = useState('')
  const r = useMemo(() => cerca(viaggio, testo), [viaggio, testo])
  const q = testo.trim()
  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Cerca" pieno>
      <input type="search" className="campo-in" autoFocus value={testo} enterKeyHint="search" aria-label="Cerca nel viaggio"
        placeholder="Tappe, note, prenotazioni, codici" onChange={e => setTesto(e.target.value)} />
      {q.length < 2 && <p className="testo-3" style={{ margin: '12px 4px' }}>Almeno due lettere. Maiuscole e accenti non contano.</p>}
      {q.length >= 2 && r.totale === 0 && <p className="testo-2" style={{ margin: '16px 4px' }}>Niente per "{q}".</p>}
      {r.prenotazioni.length > 0 && (
        <Gruppo titolo="Prenotazioni">
          {r.prenotazioni.map(p => {
            const Icona = ICONA_PRENOTAZIONE[p.tipo]
            return (
              <Riga key={p.id} icona={<Icona size={20} />} titolo={p.titolo || 'Senza titolo'}
                sottotitolo={[descriviQuando(p), p.codice].filter(Boolean).join(' · ') || undefined}
                onClick={() => { onChiudi(); location.hash = hrefDocumento(p.id) }} />
            )
          })}
        </Gruppo>
      )}
      {r.giorni.map(g => (
        <Gruppo key={g.giorno.id} titolo={`G${g.indice} · ${formatoData(g.data, 'breve')} · ${cittaDi(viaggio, g.giorno).nome}`}>
          {g.tappe.map(t => {
            const Icona = ICONA_TIPO[t.tipo]
            return <Riga key={t.id} icona={<Icona size={20} />} titolo={t.titolo} sottotitolo={t.ora ?? undefined} onClick={() => onTappa(g.giorno.id, t.id)} />
          })}
        </Gruppo>
      ))}
    </Foglio>
  )
}

/** La lente della barra in alto. La tappa trovata si apre in sola lettura, qualunque giorno sia. */
export function PulsanteRicerca() {
  const [aperto, setAperto] = useState(false)
  const [tappa, setTappa] = useState<{ giornoId: string; tappaId: string } | null>(null)
  return (
    <>
      <button type="button" className="pulsante-icona" aria-label="Cerca" onClick={() => setAperto(true)}>
        <Search size={22} aria-hidden />
      </button>
      <FoglioRicerca aperto={aperto} onChiudi={() => setAperto(false)}
        onTappa={(giornoId, tappaId) => { setAperto(false); setTappa({ giornoId, tappaId }) }} />
      <FoglioTappa giornoId={tappa?.giornoId ?? null} tappaId={tappa?.tappaId ?? null} onChiudi={() => setTappa(null)} />
    </>
  )
}
