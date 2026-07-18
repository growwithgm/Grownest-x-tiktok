// Minimal dependency-free .xlsx writer: one worksheet, inline strings, no
// compression (ZIP "store" entries). Enough for TikTok Shop's Ship File
// upload, which only needs a plain grid of cells.

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

interface ZipEntry {
  name: string
  data: Uint8Array
}

function buildZip(entries: ZipEntry[]): Uint8Array {
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  const u16 = (n: number) => new Uint8Array([n & 0xff, (n >> 8) & 0xff])
  const u32 = (n: number) => new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff])
  const concat = (...parts: Uint8Array[]) => {
    const total = parts.reduce((s, p) => s + p.length, 0)
    const out = new Uint8Array(total)
    let pos = 0
    for (const p of parts) {
      out.set(p, pos)
      pos += p.length
    }
    return out
  }

  for (const entry of entries) {
    const name = utf8(entry.name)
    const crc = crc32(entry.data)
    const local = concat(
      u32(0x04034b50),
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method: store
      u16(0),
      u16(0), // mod time/date
      u32(crc),
      u32(entry.data.length),
      u32(entry.data.length),
      u16(name.length),
      u16(0),
      name,
      entry.data,
    )
    central.push(
      concat(
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(entry.data.length),
        u32(entry.data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ),
    )
    chunks.push(local)
    offset += local.length
  }

  const centralStart = offset
  const centralBytes = concat(...central)
  const end = concat(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralBytes.length),
    u32(centralStart),
    u16(0),
  )
  return concat(...chunks, centralBytes, end)
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function columnRef(index: number): string {
  let ref = ""
  let n = index + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    ref = String.fromCharCode(65 + rem) + ref
    n = Math.floor((n - 1) / 26)
  }
  return ref
}

export function buildXlsx(sheetName: string, rows: string[][]): Uint8Array {
  const rowsXml = rows
    .map((cells, r) => {
      const cellsXml = cells
        .map(
          (value, c) =>
            `<c r="${columnRef(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`,
        )
        .join("")
      return `<row r="${r + 1}">${cellsXml}</row>`
    })
    .join("")

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`

  return buildZip([
    { name: "[Content_Types].xml", data: utf8(contentTypes) },
    { name: "_rels/.rels", data: utf8(rootRels) },
    { name: "xl/workbook.xml", data: utf8(workbookXml) },
    { name: "xl/_rels/workbook.xml.rels", data: utf8(workbookRels) },
    { name: "xl/worksheets/sheet1.xml", data: utf8(sheetXml) },
  ])
}
