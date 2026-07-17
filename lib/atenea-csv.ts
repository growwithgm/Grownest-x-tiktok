// ATENEA (Correos bulk-admission) CSV generation.
//
// ATENEA's saved import template has NO text qualifier configured and expects
// ISO-8859-15-compatible bytes, so this module must emit: 10 comma-separated
// columns, no quoting of any kind, no BOM, LF line endings, windows-1252 bytes.
// Every sanitizer here exists to keep those constraints true for arbitrary
// TikTok Shop order data (commas in product names, smart punctuation, etc.).

export const ATENEA_HEADERS = [
  "Recipient name",
  "Recipient Phone",
  "Recipient e-mail",
  "Recipient address",
  "Recipient ZIP code",
  "Recipient country",
  "Reference",
  "Recip. additional address",
  "Package Description",
  "Weight (Kg)",
] as const

export interface AteneaRecord {
  name: string
  phone: string
  email: string
  address1: string
  zip: string
  country: string
  reference: string
  address2: string
  description: string
  weightKg: number
}

const TRANSLITERATIONS: Array<[RegExp, string]> = [
  [/[–—−]/g, "-"], // – — − → -
  [/…/g, "..."], // … → ...
  [/[‘’‚′]/g, "'"], // ' ' ‚ ′ → '
  [/[“”„″«»]/g, '"'], // " " „ ″ « » → "
  [/[®™]/g, ""], // ® ™ stripped
  [/ /g, " "], // NBSP → space
]

// A field must never introduce a comma (column shift), a control character
// (row break), or doubled whitespace into the unquoted CSV.
export function sanitizeField(value: string | number | null | undefined): string {
  let s = String(value ?? "")
  for (const [pattern, replacement] of TRANSLITERATIONS) {
    s = s.replace(pattern, replacement)
  }
  s = s.replace(/[,\r\n\t]/g, " ")
  s = s.replace(/ {2,}/g, " ")
  return s.trim()
}

export function truncateDescription(value: string, maxLength = 140): string {
  const s = sanitizeField(value)
  if (s.length <= maxLength) return s
  let cut = s.slice(0, maxLength - 3)
  const lastSpace = cut.lastIndexOf(" ")
  if (lastSpace > 0) cut = cut.slice(0, lastSpace)
  return cut.trimEnd() + "..."
}

// ATENEA expects "(+34)" followed by the 9-digit national number.
export function formatSpanishPhone(value: string | null | undefined): string {
  const raw = sanitizeField(value)
  if (!raw) return ""
  let digits = raw.replace(/\D/g, "")
  if (digits.startsWith("0034")) digits = digits.slice(4)
  else if (digits.startsWith("34") && digits.length === 11) digits = digits.slice(2)
  if (/^\d{9}$/.test(digits)) return `(+34)${digits}`
  return raw.replace(/ /g, "")
}

// Spanish ZIPs are 5 digits; spreadsheet round-trips routinely strip the
// leading zero (07760 → 7760), so re-pad numeric values.
export function formatSpanishZip(value: string | null | undefined): string {
  const raw = sanitizeField(value)
  if (/^\d{1,5}$/.test(raw)) return raw.padStart(5, "0")
  return raw
}

export interface AteneaCsvResult {
  ok: boolean
  csv: string
  errors: string[]
}

export function buildAteneaCsv(records: AteneaRecord[]): AteneaCsvResult {
  const errors: string[] = []
  const lines: string[] = [ATENEA_HEADERS.join(",")]

  records.forEach((record, index) => {
    const address1 = sanitizeField(record.address1)
    const address2 = sanitizeField(record.address2) || address1
    const fields = [
      sanitizeField(record.name),
      formatSpanishPhone(record.phone),
      sanitizeField(record.email),
      address1,
      formatSpanishZip(record.zip),
      sanitizeField(record.country) || "España",
      sanitizeField(record.reference),
      address2,
      truncateDescription(record.description),
      (Number.isFinite(record.weightKg) ? record.weightKg : 0).toFixed(2),
    ]
    const line = fields.join(",")
    const commaCount = line.split(",").length - 1
    if (commaCount !== 9) {
      errors.push(`Row ${index + 1} (${fields[0] || "unnamed"}): expected 9 commas, got ${commaCount} → ${line}`)
      return
    }
    if (/[\r\n]/.test(line)) {
      errors.push(`Row ${index + 1} (${fields[0] || "unnamed"}): contains line break → ${line}`)
      return
    }
    lines.push(line)
  })

  return { ok: errors.length === 0, csv: lines.join("\n") + "\n", errors }
}

// windows-1252 0x80–0x9F extras; all other codepoints ≤0xFF map directly.
const CP1252_EXTRA: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84,
  "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88,
  "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c,
  "Ž": 0x8e, "‘": 0x91, "’": 0x92, "“": 0x93,
  "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b,
  "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
}

// Browsers' TextEncoder is UTF-8-only, so encode manually. No BOM.
export function encodeCp1252(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code <= 0x7f || (code >= 0xa0 && code <= 0xff)) {
      bytes[i] = code
    } else if (CP1252_EXTRA[text[i]] !== undefined) {
      bytes[i] = CP1252_EXTRA[text[i]]
    } else {
      bytes[i] = 0x3f // "?"
    }
  }
  return bytes
}

// ---------------------------------------------------------------------------
// Column resolution against the uploaded CSV's real header row.
//
// The pre-fix exporter addressed the TikTok Shop export by hard-coded column
// numbers (ZIP=46, address=47, …). TikTok inserts/renames columns between
// export versions, which silently shifted ZIP into the address column and
// dropped address line 2. Resolving by header name is stable across layouts;
// the legacy indices remain only as a last-resort fallback.
// ---------------------------------------------------------------------------

export interface AteneaColumnIndices {
  name: number
  nameFallback: number
  phone: number
  email: number
  country: number
  zip: number
  address1: number
  address2: number
  reference: number
  description: number
  weight: number
}

const HEADER_CANDIDATES: Record<string, string[]> = {
  name: ["Recipient", "Recipient Name"],
  phone: ["Phone #", "Phone Number", "Phone"],
  email: ["Email", "E-mail", "Buyer Email", "Recipient Email"],
  country: ["Country", "Country/Region", "Region"],
  zip: ["Zipcode", "Zip Code", "Postal Code", "Post Code", "ZIP"],
  address1: ["Street Name", "Detail Address", "Address Line 1", "Street", "Address"],
  address2: [
    "House Name or Number",
    "Additional address information",
    "Additional Address Information",
    "Address Line 2",
    "Extra Address",
  ],
  reference: ["Order ID"],
  description: ["Product Name"],
  weight: ["Weight (Kg)", "Weight(kg)", "Weight (kg)", "Package Weight", "Weight"],
}

const LEGACY_INDICES: Record<string, number> = {
  name: 38,
  phone: 39,
  email: 40,
  country: 41,
  zip: 45,
  address1: 46,
  address2: 47,
  reference: 0,
  description: 7,
  weight: 49,
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => (h || "").trim().toLowerCase())
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate.toLowerCase())
    if (idx !== -1) return idx
  }
  for (const candidate of candidates) {
    const target = candidate.toLowerCase()
    const idx = normalized.findIndex((h) => h !== "" && (h.includes(target) || target.includes(h)))
    if (idx !== -1) return idx
  }
  return -1
}

// mappingArray is the saved column mapping from the map-columns page
// (14 header names, indexed by requiredFields order).
const MAPPING_ARRAY_SLOTS: Record<string, number> = {
  reference: 1,
  description: 2,
  name: 6,
  phone: 7,
  address1: 8,
  address2: 9,
  zip: 12,
  weight: 13,
}

export function resolveAteneaColumns(headers: string[], mappingArray?: string[]): AteneaColumnIndices {
  const resolve = (field: string): number => {
    if (mappingArray) {
      const slot = MAPPING_ARRAY_SLOTS[field]
      if (slot !== undefined) {
        const mappedHeader = (mappingArray[slot] || "").trim()
        if (mappedHeader && mappedHeader !== "none") {
          const idx = findHeaderIndex(headers, [mappedHeader])
          if (idx !== -1) return idx
        }
      }
    }
    const idx = findHeaderIndex(headers, HEADER_CANDIDATES[field] || [])
    if (idx !== -1) return idx
    return LEGACY_INDICES[field] ?? -1
  }

  return {
    name: resolve("name"),
    nameFallback: LEGACY_INDICES.phone,
    phone: resolve("phone"),
    email: resolve("email"),
    country: resolve("country"),
    zip: resolve("zip"),
    address1: resolve("address1"),
    address2: resolve("address2"),
    reference: resolve("reference"),
    description: resolve("description"),
    weight: resolve("weight"),
  }
}
