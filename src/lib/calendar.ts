import { addMonths, type Item } from './warranty'

function icsDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/**
 * Download a calendar event 30 days before the warranty ends, so the user
 * gets a reminder in whatever calendar app they already use.
 */
export function downloadReminder(item: Item) {
  const end = addMonths(item.purchaseDate, item.warrantyMonths)
  const remind = new Date(end)
  remind.setUTCDate(remind.getUTCDate() - 30)
  const next = new Date(remind)
  next.setUTCDate(next.getUTCDate() + 1)

  const description = [
    `The warranty for ${item.name} ends on ${end.toISOString().slice(0, 10)}.`,
    'Check it for problems now and file a claim if anything is wrong.',
    item.store ? `Bought at: ${item.store}` : '',
    item.serialNumber ? `Serial: ${item.serialNumber}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Warranty Wallet//EN',
    'BEGIN:VEVENT',
    `UID:${item.$id}@warranty-wallet`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${icsDate(remind)}`,
    `DTEND;VALUE=DATE:${icsDate(next)}`,
    `SUMMARY:${escapeIcs(`Warranty ends in 30 days: ${item.name}`)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${item.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-warranty.ics`
  a.click()
  URL.revokeObjectURL(url)
}
