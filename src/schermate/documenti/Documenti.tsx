import { BarraNav, TitoloGrande, Vuoto } from '../../ui/componenti'

export default function Documenti({ id }: { id: string | null }) {
  return (
    <div className="schermata">
      <BarraNav titolo="Documenti" />
      <TitoloGrande>Documenti</TitoloGrande>
      <Vuoto titolo="Prenotazioni" testo={id ? `Prenotazione ${id}` : 'Voli, hotel, treni e biglietti, con i QR offline.'} />
    </div>
  )
}
