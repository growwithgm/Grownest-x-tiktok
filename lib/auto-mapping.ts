// Automatic column mapping for TikTok Shop order exports: uploads skip the
// Map Columns screen entirely when every required field resolves against the
// CSV headers. The screen remains available (Settings → Column mapping) as a
// manual fallback.

// requiredFields order used by the map-columns page when persisting mappings
export const MAPPING_FIELD_ORDER = [
  "buyerUsername",
  "orderId",
  "productName",
  "sku",
  "sellerSku",
  "quantity",
  "recipientName",
  "phoneNumber",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "postalCode",
  "weight",
] as const

export type MappingFieldId = (typeof MAPPING_FIELD_ORDER)[number]

// Factory default: header candidates per field, matching the TikTok Shop
// export ("To_Ship_order...csv") and the mapping the warehouse team uses.
const FIELD_CANDIDATES: Record<MappingFieldId, string[]> = {
  buyerUsername: ["Buyer Username"],
  orderId: ["Order ID"],
  productName: ["Product Name"],
  sku: ["SKU ID"],
  sellerSku: ["Seller SKU"],
  quantity: ["Quantity"],
  recipientName: ["Recipient"],
  phoneNumber: ["Phone #", "Phone Number", "Phone"],
  addressLine1: ["Street Name", "Detail Address", "Address Line 1"],
  addressLine2: ["House Name or Number", "Additional address information", "Address Line 2"],
  city: ["City"],
  state: ["Province", "Autonomous Community", "State"],
  postalCode: ["Zipcode", "Zip Code", "Postal Code"],
  weight: ["Weight(kg)", "Weight (Kg)", "Weight (kg)", "Weight", "Package Weight"],
}

const REQUIRED_FIELDS: MappingFieldId[] = [
  "buyerUsername",
  "orderId",
  "productName",
  "sku",
  "sellerSku",
  "quantity",
  "recipientName",
  "phoneNumber",
  "weight",
]

function matchHeader(headers: string[], candidates: string[]): string | null {
  const trimmed = headers.map((h) => (h || "").trim())
  for (const candidate of candidates) {
    const exact = trimmed.find((h) => h.toLowerCase() === candidate.toLowerCase())
    if (exact) return exact
  }
  for (const candidate of candidates) {
    const target = candidate.toLowerCase()
    const fuzzy = trimmed.find((h) => h && (h.toLowerCase().includes(target) || target.includes(h.toLowerCase())))
    if (fuzzy) return fuzzy
  }
  return null
}

// Resolves a full field→header mapping. A saved default mapping (the array
// the map-columns page stores) wins per-field when its header exists in this
// CSV; factory candidates fill the rest.
export function buildAutoMapping(headers: string[], savedDefault?: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  MAPPING_FIELD_ORDER.forEach((field, index) => {
    let header: string | null = null
    if (savedDefault) {
      const saved = (savedDefault[index] || "").trim()
      if (saved && saved !== "none") {
        header = matchHeader(headers, [saved])
      }
    }
    if (!header) {
      header = matchHeader(headers, FIELD_CANDIDATES[field])
    }
    mapping[field] = header || "none"
  })
  return mapping
}

export function missingRequiredFields(mapping: Record<string, string>): MappingFieldId[] {
  return REQUIRED_FIELDS.filter((field) => !mapping[field] || mapping[field] === "none")
}

// Persist the resolved mapping in the same shape the map-columns page uses,
// so the manual screen shows exactly what auto-mapping picked.
export function persistMappingAsDefault(mapping: Record<string, string>): void {
  try {
    const stored = JSON.parse(localStorage.getItem("columnMappings") || "{}")
    stored.default = MAPPING_FIELD_ORDER.map((field) => (mapping[field] === "none" ? "" : mapping[field]))
    localStorage.setItem("columnMappings", JSON.stringify(stored))
  } catch (error) {
    console.error("Failed to persist auto mapping:", error)
  }
}

// One-shot upload pipeline: auto-map, process, store slips. Returns the route
// to navigate to — "/results" on success, "/map-columns" when the headers
// can't be resolved automatically (manual mapping fallback).
export async function autoProcessUpload(csvContent: string, headers: string[]): Promise<"/results" | "/map-columns"> {
  try {
    let savedDefault: string[] | undefined
    try {
      const stored = JSON.parse(localStorage.getItem("columnMappings") || "{}")
      if (Array.isArray(stored.default)) savedDefault = stored.default
    } catch {
      // ignore corrupt saved mappings
    }

    const mapping = buildAutoMapping(headers, savedDefault)
    if (missingRequiredFields(mapping).length > 0) {
      return "/map-columns"
    }

    const { processCSVWithMapping } = await import("./csv-processor")
    const result = await processCSVWithMapping(csvContent, mapping)
    if (result.success && result.data.length > 0) {
      localStorage.setItem("packingSlips", JSON.stringify(result.data))
      persistMappingAsDefault(mapping)
      return "/results"
    }
    return "/map-columns"
  } catch (error) {
    console.error("Auto-processing failed, falling back to manual mapping:", error)
    return "/map-columns"
  }
}
