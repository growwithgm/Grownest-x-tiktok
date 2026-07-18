// Node built-in tests for the Convert tools (no dependencies).
import { test } from "node:test"
import assert from "node:assert/strict"

import {
  DEFAULT_CARRIER,
  filterRowsByColumnValue,
  findFulfillmentColumn,
  normalizeCarrier,
  parseAmazonTrackingTxt,
} from "../lib/converters.ts"
import { buildXlsx } from "../lib/xlsx-lite.ts"

test("parseAmazonTrackingTxt: header-based parsing with carrier normalization", () => {
  const txt = [
    "order-id\tcarrier-name\ttracking-number",
    "576824019283746\tcorreos\tPQ4471829023ES",
    "576824019283891\tSEUR\tSE0098124471ES",
    "576824019284012\tgls\tGL5521008873ES",
    "576824019284233\tctt express\tCT8830012245ES",
    "576824019284567\tCorreos Express\tCX1190556677ES",
    "incomplete-row\t\t", // dropped: no tracking
  ].join("\r\n")
  const rows = parseAmazonTrackingTxt(txt)
  assert.equal(rows.length, 5)
  assert.deepEqual(rows[0], { orderId: "576824019283746", carrier: "Correos", trackingId: "PQ4471829023ES" })
  assert.equal(rows[1].carrier, "Seur")
  assert.equal(rows[2].carrier, "GLS Spain")
  assert.equal(rows[3].carrier, "CTT Express")
  assert.equal(rows[4].carrier, "Correos Express")
})

test("parseAmazonTrackingTxt: headerless files assume column order", () => {
  const rows = parseAmazonTrackingTxt("576800000000000001\tcorreos\tPQ111ES\n576800000000000002\t\tPQ222ES")
  assert.equal(rows.length, 2)
  assert.equal(rows[1].carrier, DEFAULT_CARRIER) // empty carrier falls back
})

test("normalizeCarrier keeps unknown carriers verbatim", () => {
  assert.equal(normalizeCarrier("Paquetería Local"), "Paquetería Local")
  assert.equal(normalizeCarrier("  "), DEFAULT_CARRIER)
})

test("findFulfillmentColumn locates the TikTok export header", () => {
  assert.equal(findFulfillmentColumn(["Order ID", "Fulfillment Type", "Recipient"]), 1)
  assert.equal(findFulfillmentColumn(["Order ID", "fulfilment type"]), 1)
  assert.equal(findFulfillmentColumn(["Order ID", "Recipient"]), -1)
})

test("filterRowsByColumnValue removes only the chosen type, keeps the header", () => {
  const rows = [
    ["Order ID", "Fulfillment Type"],
    ["1", "Fulfillment by TikTok Shop"],
    ["2", "Fulfilled by seller"],
    ["3", "fulfillment by tiktok shop"], // case-insensitive match
  ]
  const { kept, removedCount } = filterRowsByColumnValue(rows, 1, "Fulfillment by TikTok Shop")
  assert.equal(removedCount, 2)
  assert.deepEqual(
    kept.map((r) => r[0]),
    ["Order ID", "2"],
  )
})

test("buildXlsx produces a valid store-only ZIP with the expected parts", () => {
  const bytes = buildXlsx("Ship File", [
    ["Order ID", "Carrier", "Tracking ID"],
    ["576824019283746", "Correos", "PQ4471829023ES"],
    ["esc & <chars>", "A\"B", "x"],
  ])
  // ZIP local-file signature
  assert.deepEqual(Array.from(bytes.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04])
  const text = Buffer.from(bytes).toString("latin1")
  for (const part of [
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/worksheets/sheet1.xml",
  ]) {
    assert.ok(text.includes(part), `missing zip entry ${part}`)
  }
  // Cell content is stored inline (no compression), XML-escaped
  assert.ok(text.includes("PQ4471829023ES"))
  assert.ok(text.includes("esc &amp; &lt;chars&gt;"))
  // End-of-central-directory record present
  assert.ok(text.includes("PK\x05\x06"))
})
