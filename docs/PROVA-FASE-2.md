# Fase 2 — cosa è cambiato e come provarla

## Novità
- **Tab bar a cinque voci**, più grande e leggibile: Oggi · Programma · Mappa · Documenti · Spese. Le impostazioni (la vecchia scheda Viaggio) si aprono dall'ingranaggio in alto a sinistra di Oggi.
- **Tasto "+"** in basso a destra (non sulla Mappa): spesa, tappa, prenotazione.
- **Documenti**: voli, hotel, treni, biglietti e ristoranti, con codice copiabile con un tocco, foto del QR e PDF che restano offline, visualizzatore a tutto schermo su fondo bianco per lo scanner, scadenze "da prenotare entro" in rosso quando mancano 7 giorni. Partono già i voli, gli hotel (con check-in e check-out) e i biglietti delle tappe, tutti da prenotare.
- **Hotel e notti**: un hotel prenotato copre le sue notti in Oggi ("Stanotte") e nel Programma, con codice e indirizzo per il taxi. In Oggi la card "Prossimo: Volo fra 3 h" nelle 24 ore prima.
- **Spese**: tre tocchi per inserirne una, yen ed euro col cambio della BCE (o uno scritto a mano), totale e quota di ciascuno, budget di ogni giorno, contanti e carta a parte, **chi deve a chi** col numero minimo di rimborsi e "Segna come saldato".
- **Calendario**: "Aggiungi al calendario" (Documenti e Impostazioni) crea `giappone-2027.ics` con gli avvisi: 3 ore prima di voli e treni, 1 ora prima del resto, le scadenze per prenotare alle 9, il tax-free 4 ore prima del volo di ritorno. Gli avvisi li dà il calendario del telefono, anche ad app chiusa.
- **Orari di apertura** sulle tappe, con avvisi "Chiuso il mercoledì" / "Apre alle 10:00"; pre-compilati per i luoghi principali (da verificare sul sito) e cercabili su OpenStreetMap.
- **Ricerca** (lente in Programma e Documenti) in tappe, note e prenotazioni, senza badare a maiuscole e accenti.
- **Comodità**: scorri una tappa verso destra per segnarla fatta, "Tieni acceso lo schermo" in Oggi, scorciatoie tenendo premuta l'icona (Android), spazio usato in Impostazioni.
- **Backup** con gli allegati dentro: un backup della fase 1 resta importabile.

## Da provare sul telefono (iPhone e Android)
1. Aprire l'app dall'icona: si aggiorna da sola. Chi aveva già dati: Impostazioni → Dati → **Aggiungi prenotazioni e orari del 2027** (aggiunge solo quello che manca, si può annullare).
2. Documenti: aprire "Volo Roma → Tokyo", Modifica, scrivere il codice, segnarla prenotata, **Scatta foto** a un QR qualsiasi, Salva. Toccare il codice ("Copiato") e la foto (visualizzatore bianco, zoom). Modalità aereo: la foto si apre lo stesso.
3. Segnare prenotato "Kyoto Gion Hotel" col suo codice; aprire `…/?oggi=2027-08-16T10:15#/oggi`: in "Stanotte" ci sono la prenotazione, il codice e la scheda per il tassista.
4. Spese: "+" → Spesa, scrivere 1500, Salva. Altre due spese pagate da persone diverse, una in euro. Guardare "Chi deve a chi" e provare "Segna come saldato" e poi "Annulla". Scorrere una spesa verso sinistra per eliminarla.
5. Impostazioni → Promemoria → **Aggiungi al calendario**: aprire il file `.ics` col Calendario; controllare l'ora del volo di andata (12:30 ora italiana) e che gli avvisi ci siano.
6. Programma G3: avviso sul Tsukiji del mercoledì festivo. Programma G8: aprire il Kinkaku-ji, Modifica, **Cerca orari su OpenStreetMap**.
7. Programma: scorrere una tappa verso destra (diventa fatta), rifarlo (torna da fare).
8. Oggi durante il viaggio (`?oggi=…`): accendere "Tieni acceso lo schermo" e lasciare il telefono fermo: lo schermo non si spegne.
9. Android: tenere premuta l'icona dell'app → "Aggiungi spesa" apre il foglio della spesa.
10. Impostazioni → Salva o condividi un backup: il file contiene anche gli allegati; importarlo su un altro telefono e riaprire la prenotazione con la foto.

La prova di offline e installazione dal computer si fa in **Chrome con l'estensione Claude**: il browser integrato non registra il service worker.

## Cose da sapere
- **iPhone**: le scorciatoie dell'icona non esistono; la vibrazione dello scorrimento non c'è; "Tieni acceso lo schermo" compare solo dove Safari supporta la Wake Lock API.
- Su iPhone, condividere il backup dopo aver letto gli allegati può far cadere il menu di condivisione: in quel caso il file viene scaricato (si trova in File → Download).
- Gli orari pre-compilati e quelli di OpenStreetMap vanno verificati sul sito del luogo prima di andare.
- Il cambio di ogni spesa resta quello del momento in cui è stata scritta: i totali non cambiano col cambio dei giorni dopo.

## Rimasto da fare
- Fase 3: vicino a me, frasario, emergenze, checklist, guida pratica, meteo orario, diario, consigli dai reel.
- Fuori dal progetto (richiederebbero un server): import delle email, stato dei voli in tempo reale, notifiche push, sincronizzazione fra telefoni. Al loro posto: backup, `.ics` e link alle app delle compagnie.
- Da completare nell'app quando li sapete: codici e allegati delle prenotazioni, aeroporto (Haneda o Narita), l'hotel di Tokyo del 25–26 agosto, gli indirizzi in giapponese degli hotel, le date di prenotazione ("da prenotare entro").
