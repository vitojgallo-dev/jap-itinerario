import { BarraNav, TitoloGrande } from '../../ui/componenti'

export default function Mappa({ indice }: { indice: number | null }) {
  return (
    <div className="schermata">
      <BarraNav titolo="Mappa" />
      <TitoloGrande>Mappa {indice ?? ''}</TitoloGrande>
    </div>
  )
}
