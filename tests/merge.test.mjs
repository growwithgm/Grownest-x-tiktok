// Node built-in tests for same-buyer shipment merging (no dependencies).
// Run with: node --test tests/
import { test } from "node:test"
import assert from "node:assert/strict"

import {
  buildAteneaCsv,
  buildShipments,
  normalizeAddressKey,
  normalizeBuyerKey,
  sortOrderIdsOldestFirst,
} from "../lib/atenea-csv.ts"

const base = {
  email: "",
  country: "España",
  description: "Champú Sólido",
}

function order(overrides) {
  return {
    orderId: "",
    username: "",
    name: "",
    phone: "",
    email: base.email,
    country: base.country,
    address1: "",
    zip: "",
    address2: "",
    description: base.description,
    weightKg: 0,
    ...overrides,
  }
}

// Vanessa: two orders, same buyer account (trailing-tab + case variants), same address
const VANESSA = [
  order({
    orderId: "576900000000000002",
    username: "vanessa.garcia\t",
    name: "Vanessa García",
    phone: "612000111",
    zip: "41006",
    address1: "Calle Feria 12",
    address2: "2B",
    weightKg: 0.53,
  }),
  order({
    orderId: "576900000000000001",
    username: "Vanessa.Garcia",
    name: "Vanessa García",
    phone: "612000111",
    zip: "41006",
    address1: "Calle  Feria 12",
    address2: "2B",
    weightKg: 0.53,
  }),
]

test("buyer key: trim, strip trailing tab, lowercase; phone digits fallback", () => {
  assert.equal(normalizeBuyerKey("vanessa.garcia\t", ""), "vanessa.garcia")
  assert.equal(normalizeBuyerKey("  Vanessa.Garcia  ", ""), "vanessa.garcia")
  assert.equal(normalizeBuyerKey("", "(+34)612 000 111"), "612000111")
  assert.equal(normalizeBuyerKey("", "0034612000111"), "612000111")
  assert.equal(normalizeBuyerKey("", ""), "")
})

test("address key ignores case, commas and extra spaces", () => {
  assert.equal(
    normalizeAddressKey("41006", "Calle  Feria 12", "2B"),
    normalizeAddressKey("41006", "calle feria, 12", "2b"),
  )
})

test("Vanessa: same account, same address → 1 row, weight 1.06, oldest ID as Reference", () => {
  const { shipments, notices } = buildShipments(VANESSA, true)
  assert.equal(shipments.length, 1)
  assert.equal(notices.length, 0)
  const s = shipments[0]
  assert.equal(s.reference, "576900000000000001") // oldest of the two IDs
  assert.deepEqual(s.orderIds, ["576900000000000001", "576900000000000002"])
  const { csv, ok } = buildAteneaCsv(shipments)
  assert.equal(ok, true)
  const row = csv.trimEnd().split("\n")[1].split(",")
  assert.equal(row[9], "1.06")
  assert.equal(row[6], "576900000000000001")
})

test("same account, SAME zip but different street → split by address guard + notice", () => {
  const rows = [
    order({
      orderId: "576910000000000001",
      username: "pablo.dc",
      name: "Pablo Dos Casas",
      phone: "611111111",
      zip: "28001",
      address1: "Calle Mayor 1",
      address2: "3A",
      weightKg: 0.4,
    }),
    order({
      orderId: "576910000000000002",
      username: "pablo.dc",
      name: "Pablo Dos Casas",
      phone: "611111111",
      zip: "28001",
      address1: "Calle Menor 9",
      address2: "1B",
      weightKg: 0.6,
    }),
  ]
  const { shipments, notices } = buildShipments(rows, true)
  assert.equal(shipments.length, 2)
  assert.equal(notices.length, 1)
  assert.equal(notices[0], "«Pablo Dos Casas» — orders to 2 different addresses, kept as separate shipments")
  const weights = shipments.map((s) => s.weightKg.toFixed(2)).sort()
  assert.deepEqual(weights, ["0.40", "0.60"])
})

test("same account, same address, 3 orders → 1 row, weights summed, 3 IDs oldest-first", () => {
  const mk = (id, w) =>
    order({
      orderId: id,
      username: "triple.buyer",
      name: "Trini Triple",
      phone: "622222222",
      zip: "09400",
      address1: "Plaza Santiago",
      address2: "8 4B",
      weightKg: w,
    })
  const rows = [mk("576920000000000003", 1.0), mk("576920000000000001", 0.5), mk("576920000000000002", 0.25)]
  const { shipments, notices } = buildShipments(rows, true)
  assert.equal(shipments.length, 1)
  assert.equal(notices.length, 0)
  assert.deepEqual(shipments[0].orderIds, [
    "576920000000000001",
    "576920000000000002",
    "576920000000000003",
  ])
  assert.equal(shipments[0].reference, "576920000000000001")
  assert.equal(shipments[0].weightKg.toFixed(2), "1.75")
})

test("empty username falls back to phone digits for merging (country prefix ignored)", () => {
  const rows = [
    order({ orderId: "1001", username: "", name: "Sin User", phone: "(+34)633333333", zip: "07760", address1: "Camí 4", weightKg: 0.2 }),
    order({ orderId: "1002", username: "", name: "Sin User", phone: "633 333 333", zip: "07760", address1: "Camí 4", weightKg: 0.3 }),
  ]
  const { shipments } = buildShipments(rows, true)
  assert.equal(shipments.length, 1)
  assert.equal(shipments[0].weightKg.toFixed(2), "0.50")
})

test("toggle OFF → strict per-order rows (item rows of one order still collapse)", () => {
  const rows = [
    ...VANESSA,
    // second item line of Vanessa's first order (same order ID)
    order({
      orderId: "576900000000000002",
      username: "vanessa.garcia\t",
      name: "Vanessa García",
      phone: "612000111",
      zip: "41006",
      address1: "Calle Feria 12",
      address2: "2B",
      weightKg: 0.1,
    }),
  ]
  const { shipments, notices } = buildShipments(rows, false)
  assert.equal(notices.length, 0)
  assert.equal(shipments.length, 2) // one per order ID, not per buyer
  const byRef = Object.fromEntries(shipments.map((s) => [s.reference, s]))
  assert.equal(byRef["576900000000000002"].weightKg.toFixed(2), "0.63")
  assert.equal(byRef["576900000000000001"].weightKg.toFixed(2), "0.53")
})

test("sortOrderIdsOldestFirst: numeric TikTok IDs sort by value, not string length", () => {
  assert.deepEqual(sortOrderIdsOldestFirst(["1000", "999", "1000"]), ["999", "1000"])
})
