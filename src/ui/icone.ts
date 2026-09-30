import { BedDouble, Car, Coffee, Footprints, Landmark, PartyPopper, Train, TramFront, Utensils, type LucideIcon } from 'lucide-react'
import type { InfoEvento, ModoSpostamento, TipoTappa } from '../model/tipi'

export const ICONA_TIPO: Record<TipoTappa, LucideIcon> = { visita: Landmark, cibo: Utensils, evento: PartyPopper, spostamento: Train, hotel: BedDouble, libero: Coffee }
export const ETICHETTA_TIPO: Record<TipoTappa, string> = { visita: 'Visita', cibo: 'Cibo', evento: 'Evento', spostamento: 'Spostamento', hotel: 'Hotel', libero: 'Tempo libero' }
export const ICONA_MODO: Record<ModoSpostamento, LucideIcon> = { piedi: Footprints, mezzi: TramFront, treno: Train, taxi: Car }
export const ETICHETTA_MODO: Record<ModoSpostamento, string> = { piedi: 'A piedi', mezzi: 'Coi mezzi', treno: 'In treno', taxi: 'In taxi' }
export const ETICHETTA_AFFIDABILITA: Record<InfoEvento['affidabilita'], string> = { certa: 'Data certa', probabile: 'Data probabile', 'da-verificare': 'Da verificare' }
