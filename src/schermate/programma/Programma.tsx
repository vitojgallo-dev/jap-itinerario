import { BarraNav, TitoloGrande } from '../../ui/componenti'

export default function Programma({ indice }: { indice: number | null }) {
  return (
    <div className="schermata">
      <BarraNav titolo="Programma" />
      <TitoloGrande>Giorno {indice ?? 0}</TitoloGrande>
    </div>
  )
}
