import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatoDurata } from '../../model/date'
import { spostaTappa } from '../../model/operazioni'
import type { Giorno, Tappa } from '../../model/tipi'
import { modoGoogle, urlPercorso } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { Vuoto } from '../../ui/componenti'
import { ETICHETTA_MODO, ICONA_MODO } from '../../ui/icone'
import { CardTappa } from './CardTappa'

export function Segmento({ da, a }: { da: Tappa; a: Tappa | undefined }) {
  if (!da.spostamento || !a) return null
  const Icona = ICONA_MODO[da.spostamento.modo]
  const durata = da.spostamento.minuti ? ` · ${formatoDurata(da.spostamento.minuti)}` : ''
  return (
    <div className="segmento">
      <Icona size={16} aria-hidden />
      <span>{ETICHETTA_MODO[da.spostamento.modo]}{durata}</span>
      {da.luogo && a.luogo && (
        <a href={urlPercorso(da.luogo, a.luogo, modoGoogle(da.spostamento.modo))} target="_blank" rel="noreferrer">Percorso</a>
      )}
    </div>
  )
}

export function VoceTimeline({ tappa, successiva, giornoId, data, onApri, children }: {
  tappa: Tappa; successiva?: Tappa; giornoId: string; data: string; onApri: (id: string) => void; children?: ReactNode
}) {
  return (
    <>
      <div className={'voce-ora' + (tappa.sera ? ' sera' : '')}>{tappa.ora ?? ''}</div>
      {children ?? <CardTappa tappa={tappa} giornoId={giornoId} data={data} onApri={() => onApri(tappa.id)} scorrevole />}
      <Segmento da={tappa} a={successiva} />
    </>
  )
}

function VoceOrdinabile({ tappa, successiva, giornoId, data, onApri }: { tappa: Tappa; successiva?: Tappa; giornoId: string; data: string; onApri: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: tappa.id })
  const maniglia = (
    <button type="button" className="maniglia" ref={setActivatorNodeRef} aria-label={`Sposta ${tappa.titolo}`} {...attributes} {...listeners}>
      <GripVertical size={20} aria-hidden />
    </button>
  )
  return (
    <li ref={setNodeRef} className="voce-timeline" style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 5 : undefined, position: 'relative' }}>
      <VoceTimeline tappa={tappa} successiva={successiva} giornoId={giornoId} data={data} onApri={onApri}>
        <CardTappa tappa={tappa} giornoId={giornoId} data={data} onApri={() => onApri(tappa.id)} maniglia={maniglia} />
      </VoceTimeline>
    </li>
  )
}

interface Props { giorno: Giorno; data: string; onApri: (id: string) => void; modifica: boolean }

export function Timeline({ giorno, data, onApri, modifica }: Props) {
  const applica = useViaggio(s => s.applica)
  const sensori = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  if (giorno.tappe.length === 0) return <Vuoto titolo="Giornata libera" testo={modifica ? 'Aggiungi la prima tappa qui sotto.' : 'Nessuna tappa in programma.'} />
  if (!modifica) {
    return (
      <ol className="timeline">
        {giorno.tappe.map((t, i) => (
          <li key={t.id} className="voce-timeline">
            <VoceTimeline tappa={t} successiva={giorno.tappe[i + 1]} giornoId={giorno.id} data={data} onApri={onApri} />
          </li>
        ))}
      </ol>
    )
  }
  const fine = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const da = giorno.tappe.findIndex(t => t.id === active.id)
    const a = giorno.tappe.findIndex(t => t.id === over.id)
    if (da < 0 || a < 0) return
    applica(v => spostaTappa(v, giorno.id, da, a))
  }
  return (
    <DndContext sensors={sensori} collisionDetection={closestCenter} onDragEnd={fine}>
      <SortableContext items={giorno.tappe.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <ol className="timeline">
          {giorno.tappe.map((t, i) => (
            <VoceOrdinabile key={t.id} tappa={t} successiva={giorno.tappe[i + 1]} giornoId={giorno.id} data={data} onApri={onApri} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}
