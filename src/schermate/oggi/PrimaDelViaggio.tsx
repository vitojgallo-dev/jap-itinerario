import { CalendarDays, Ticket } from 'lucide-react'
import { dataGiorno, formatoData, istanteTokyo } from '../../model/date'
import { backupDaFare, bigliettiDaPrenotare, cittaDi } from '../../model/riepilogo'
import { hrefBiglietti } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { PromemoriaBackup } from '../../ui/Backup'
import { BarraNav, Gruppo, LinkImpostazioni, Riga, TitoloGrande } from '../../ui/componenti'
import { InvitoInstallazione } from '../../ui/Installazione'
import { hrefRotta } from '../../ui/rotta'
import { Meteo } from './Meteo'

export function PrimaDelViaggio({ giorniMancanti, adesso }: { giorniMancanti: number; adesso: Date }) {
  const viaggio = useViaggio(s => s.viaggio)
  const primo = viaggio.giorni[0]
  const fine = dataGiorno(viaggio, Math.max(viaggio.giorni.length - 1, 0))
  const biglietti = bigliettiDaPrenotare(viaggio)
  return (
    <div className="schermata">
      <BarraNav titolo="Oggi" sinistra={<LinkImpostazioni />} />
      <TitoloGrande sopra="Si parte fra">{viaggio.titolo}</TitoloGrande>
      <div className="card conto">
        <div className="conto-numero">{giorniMancanti}</div>
        <div className="conto-testo">
          {giorniMancanti === 1 ? 'giorno' : 'giorni'}
          <div className="testo-2">{formatoData(viaggio.dataPartenza, 'lungo')} – {formatoData(fine, 'lungo')}</div>
        </div>
      </div>
      <InvitoInstallazione />
      {backupDaFare(viaggio.impostazioni.ultimoBackup, adesso) && <PromemoriaBackup />}
      {primo && giorniMancanti <= 15 && <Meteo citta={cittaDi(viaggio, primo)} data={viaggio.dataPartenza} oggi={istanteTokyo(adesso).data} />}
      {primo && (
        <Gruppo titolo="Il primo giorno">
          <Riga icona={<CalendarDays size={20} />} titolo={primo.titolo} sottotitolo={`${cittaDi(viaggio, primo).nome} · ${primo.tappe.length} tappe`} href={hrefRotta('programma', 0)} />
        </Gruppo>
      )}
      {biglietti.length > 0 && (
        <Gruppo titolo="Biglietti da prenotare" piede="Molte attrazioni aprono le prenotazioni uno o due mesi prima.">
          {biglietti.map(b => (
            <Riga key={b.tappa.id} icona={<Ticket size={20} />} titolo={b.tappa.titolo} sottotitolo={`${formatoData(b.data, 'breve')} · G${b.indice}`}
              href={hrefBiglietti(b.tappa)} />
          ))}
        </Gruppo>
      )}
    </div>
  )
}
