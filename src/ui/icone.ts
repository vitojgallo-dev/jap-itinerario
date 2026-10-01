import { BedDouble, Car, Coffee, FileText, Footprints, Landmark, PartyPopper, Plane, Ticket, Train, TrainFront, TramFront, Utensils, type LucideIcon } from 'lucide-react'
import type { InfoEvento, ModoSpostamento, TipoPrenotazione, TipoTappa } from '../model/tipi'

export const ICONA_TIPO: Record<TipoTappa, LucideIcon> = { visita: Landmark, cibo: Utensils, evento: PartyPopper, spostamento: Train, hotel: BedDouble, libero: Coffee }
export const ETICHETTA_TIPO: Record<TipoTappa, string> = { visita: 'Visita', cibo: 'Cibo', evento: 'Evento', spostamento: 'Spostamento', hotel: 'Hotel', libero: 'Tempo libero' }
export const ICONA_MODO: Record<ModoSpostamento, LucideIcon> = { piedi: Footprints, mezzi: TramFront, treno: Train, taxi: Car }
export const ETICHETTA_MODO: Record<ModoSpostamento, string> = { piedi: 'A piedi', mezzi: 'Coi mezzi', treno: 'In treno', taxi: 'In taxi' }
export const ETICHETTA_AFFIDABILITA: Record<InfoEvento['affidabilita'], string> = { certa: 'Data certa', probabile: 'Data probabile', 'da-verificare': 'Da verificare' }
export const ICONA_PRENOTAZIONE: Record<TipoPrenotazione, LucideIcon> = { volo: Plane, hotel: BedDouble, treno: TrainFront, biglietto: Ticket, ristorante: Utensils, altro: FileText }
export const ETICHETTA_PRENOTAZIONE: Record<TipoPrenotazione, string> = { volo: 'Volo', hotel: 'Hotel', treno: 'Treno', biglietto: 'Biglietto', ristorante: 'Ristorante', altro: 'Altro' }
export const GRUPPO_PRENOTAZIONE: Record<TipoPrenotazione, string> = { volo: 'Voli', hotel: 'Hotel', treno: 'Treni', biglietto: 'Biglietti', ristorante: 'Ristoranti', altro: 'Altro' }
