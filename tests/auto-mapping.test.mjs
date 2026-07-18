// Node built-in tests for automatic column mapping (no dependencies).
import { test } from "node:test"
import assert from "node:assert/strict"

import { buildAutoMapping, missingRequiredFields, MAPPING_FIELD_ORDER } from "../lib/auto-mapping.ts"

// Real header row from a TikTok Shop "To_Ship" order export (61 columns)
const REAL_HEADERS = [
  "Order ID", "Order Status", "Order Substatus", "Cancelation/Return Type", "Normal or Pre-order",
  "SKU ID", "Seller SKU", "Product Name", "Variation", "Quantity", "Sku Quantity of return",
  "SKU Unit Original Price", "SKU Subtotal Before Discount", "SKU Platform Discount",
  "SKU Seller Discount", "SKU Subtotal After Discount", "Shipping Fee After Discount",
  "Original Shipping Fee", "Shipping Fee Seller Discount", "Shipping Fee Platform Discount",
  "Taxes", "Order Amount", "Order Refund Amount", "Created Time", "Paid Time", "RTS Time",
  "Shipped Time", "Delivered Time", "Cancelled Time", "Cancel By", "Cancel Reason",
  "Fulfillment Type", "Warehouse Name", "Tracking ID", "Delivery Option", "Shipping Provider Name",
  "Buyer Message", "Buyer Username", "Recipient", "Phone #", "Email", "Country",
  "Autonomous Community", "Province", "City", "Villages", "Zipcode", "Street Name",
  "House Name or Number", "Payment Method", "Weight(kg)", "Product Category", "Package ID",
  "Seller Note", "Shipping Information", "Checked Status", "Checked Marked by",
  "Product Tax Amount", "Product Tax Rate", "Shipping Tax Amount", "Shipping Tax Rate",
  "Order Channel", "Creator Handle",
]

test("auto-mapping resolves every field on a real TikTok Shop export", () => {
  const mapping = buildAutoMapping(REAL_HEADERS)
  assert.deepEqual(missingRequiredFields(mapping), [])
  assert.equal(mapping.buyerUsername, "Buyer Username")
  assert.equal(mapping.orderId, "Order ID")
  assert.equal(mapping.productName, "Product Name")
  assert.equal(mapping.sku, "SKU ID")
  assert.equal(mapping.sellerSku, "Seller SKU")
  assert.equal(mapping.quantity, "Quantity")
  assert.equal(mapping.recipientName, "Recipient")
  assert.equal(mapping.phoneNumber, "Phone #")
  assert.equal(mapping.addressLine1, "Street Name")
  assert.equal(mapping.addressLine2, "House Name or Number")
  assert.equal(mapping.city, "City")
  assert.equal(mapping.state, "Province")
  assert.equal(mapping.postalCode, "Zipcode")
  assert.equal(mapping.weight, "Weight(kg)")
})

test("a saved default mapping wins when its headers exist in the CSV", () => {
  const saved = MAPPING_FIELD_ORDER.map(() => "")
  saved[MAPPING_FIELD_ORDER.indexOf("state")] = "Autonomous Community"
  const mapping = buildAutoMapping(REAL_HEADERS, saved)
  assert.equal(mapping.state, "Autonomous Community")
  assert.equal(mapping.orderId, "Order ID") // unset saved slots fall back to candidates
})

test("unknown headers report the missing required fields for manual fallback", () => {
  const mapping = buildAutoMapping(["Foo", "Bar", "Recipient"])
  const missing = missingRequiredFields(mapping)
  assert.ok(missing.includes("orderId"))
  assert.ok(missing.includes("weight"))
  assert.ok(!missing.includes("recipientName"))
})
