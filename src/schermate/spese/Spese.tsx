import { BarraNav, TitoloGrande, Vuoto } from '../../ui/componenti'

export default function Spese({ id }: { id: string | null }) {
  return (
    <div className="schermata">
      <BarraNav titolo="Spese" />
      <TitoloGrande>Spese</TitoloGrande>
      <Vuoto titolo={id === 'nuova' ? 'Nuova spesa' : 'Spese'} testo="Chi ha pagato, quanto, per chi; e chi deve a chi." />
    </div>
  )
}
