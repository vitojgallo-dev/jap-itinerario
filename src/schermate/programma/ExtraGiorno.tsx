import { Lightbulb } from 'lucide-react'
import { aggiornaGiorno } from '../../model/operazioni'
import type { Giorno, Suggerimento } from '../../model/tipi'
import { urlCerca } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { Gruppo, Riga } from '../../ui/componenti'

const SEZIONI: [Suggerimento['tipo'], string][] = [['cibo', 'Da assaggiare'], ['opzionale', 'Se avanza tempo'], ['souvenir', 'Souvenir']]

export function ExtraGiorno({ giorno }: { giorno: Giorno }) {
  const applica = useViaggio(s => s.applica)
  return (
    <>
      {giorno.speciale && (
        <Gruppo titolo={giorno.speciale.titolo} piede={giorno.speciale.nota}>
          {giorno.speciale.opzioni.map((o, i) => <Riga key={i} titolo={o.nome} sottotitolo={`${o.livello} · ${o.descrizione}`} href={o.link} />)}
        </Gruppo>
      )}
      {SEZIONI.map(([tipo, titolo]) => {
        const voci = giorno.suggerimenti.filter(s => s.tipo === tipo)
        if (voci.length === 0) return null
        return (
          <Gruppo key={tipo} titolo={titolo}>
            {voci.map((s, i) => <Riga key={i} titolo={s.nome} sottotitolo={s.descrizione} href={s.luogo ? urlCerca(s.luogo) : undefined} />)}
          </Gruppo>
        )
      })}
      {giorno.consigli.length > 0 && (
        <Gruppo titolo="Consigli">
          {giorno.consigli.map((c, i) => <Riga key={i} icona={<Lightbulb size={18} />} titolo={<span style={{ fontSize: 15 }}>{c}</span>} />)}
        </Gruppo>
      )}
      <Gruppo titolo="Note del giorno">
        <textarea className="campo-in nota-giorno" value={giorno.note} aria-label="Note del giorno" placeholder="Appunti, orari da ricordare, idee…"
          onChange={e => applica(v => aggiornaGiorno(v, giorno.id, { note: e.target.value }))} />
      </Gruppo>
    </>
  )
}
