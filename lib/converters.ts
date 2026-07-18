// Pure logic for the Convert tools (Ship File converter, FBT Filter).

// ---------------------------------------------------------------------------
// Ship File converter: Amazon tracking .txt (tab-separated) → TikTok Ship File
// ---------------------------------------------------------------------------

export interface TrackingRow {
  orderId: string
  carrier: string
  trackingId: string
}

// Carrier names as they appear in TikTok Shop's Ship File carrier dropdown.
const CARRIER_NORMALIZATION: Array<[RegExp, string]> = [
  [/correos\s*(express|exprés)/i, "Correos Express"],
  [/\bcex\b/i, "Correos Express"],
  [/correos/i, "Correos"],
  [/seur/i, "Seur"],
  [/\bgls\b/i, "GLS Spain"],
  [/\bctt\b/i, "CTT Express"],
  [/nacex/i, "Nacex"],
  [/mrw/i, "MRW"],
  [/dhl/i, "DHL"],
  [/ups/i, "UPS"],
]

export const DEFAULT_CARRIER = "Correos"

export function normalizeCarrier(raw: string | null | undefined): string {
  const value = String(raw ?? "").trim()
  if (!value) return DEFAULT_CARRIER
  for (const [pattern, name] of CARRIER_NORMALIZATION) {
    if (pattern.test(value)) return name
  }
  return value
}

// Amazon "Seguimiento" exports are tab-separated with a header row naming
// order-id, carrier-name (or ship-method), and tracking-number columns.
export function parseAmazonTrackingTxt(text: string): TrackingRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const header = lines[0].split("\t").map((h) => h.trim().toLowerCase())
  const find = (...patterns: RegExp[]) => header.findIndex((h) => patterns.some((p) => p.test(h)))

  let orderIdx = find(/order.?id/, /pedido/)
  let carrierIdx = find(/carrier/, /ship.?method/, /transportista/)
  let trackingIdx = find(/tracking/, /seguimiento/)
  let dataLines = lines.slice(1)

  // Headerless file: assume order-id, carrier-name, tracking-number order
  if (orderIdx === -1 && trackingIdx === -1) {
    orderIdx = 0
    carrierIdx = 1
    trackingIdx = 2
    dataLines = lines
  }

  const rows: TrackingRow[] = []
  for (const line of dataLines) {
    const cells = line.split("\t").map((c) => c.trim())
    const orderId = cells[orderIdx] ?? ""
    const trackingId = trackingIdx === -1 ? "" : (cells[trackingIdx] ?? "")
    if (!orderId || !trackingId) continue
    rows.push({
      orderId,
      carrier: normalizeCarrier(carrierIdx === -1 ? "" : cells[carrierIdx]),
      trackingId,
    })
  }
  return rows
}

// ---------------------------------------------------------------------------
// FBT Filter: drop rows of a chosen fulfillment type from an order export
// ---------------------------------------------------------------------------

export function findFulfillmentColumn(headers: string[]): number {
  const normalized = headers.map((h) => (h || "").trim().toLowerCase())
  let idx = normalized.findIndex((h) => /fulfil?lment\s*type/.test(h))
  if (idx === -1) idx = normalized.findIndex((h) => /fulfil/.test(h))
  return idx
}

export interface FbtFilterResult {
  kept: string[][]
  removedCount: number
}

export function filterRowsByColumnValue(rows: string[][], columnIndex: number, valueToRemove: string): FbtFilterResult {
  if (rows.length === 0) return { kept: [], removedCount: 0 }
  const [header, ...data] = rows
  const target = valueToRemove.trim().toLowerCase()
  const kept: string[][] = [header]
  let removedCount = 0
  for (const row of data) {
    if ((row[columnIndex] ?? "").trim().toLowerCase() === target) {
      removedCount++
    } else {
      kept.push(row)
    }
  }
  return { kept, removedCount }
}
