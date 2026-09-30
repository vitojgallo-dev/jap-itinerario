import { faseViaggio } from '../../model/adesso'
import { useViaggio } from '../../store/viaggio'
import { useAdesso } from '../../ui/hook'
import { DopoIlViaggio } from './DopoIlViaggio'
import { DuranteIlViaggio } from './DuranteIlViaggio'
import { PrimaDelViaggio } from './PrimaDelViaggio'
import './oggi.css'

export default function Oggi() {
  const viaggio = useViaggio(s => s.viaggio)
  const adesso = useAdesso()
  const fase = faseViaggio(viaggio, adesso)
  if (fase.fase === 'prima') return <PrimaDelViaggio giorniMancanti={fase.giorniMancanti} adesso={adesso} />
  if (fase.fase === 'durante') return <DuranteIlViaggio indice={fase.indice} adesso={adesso} />
  return <DopoIlViaggio />
}
