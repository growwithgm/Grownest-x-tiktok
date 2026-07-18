// Built-in packing slip templates, seeded into localStorage on first run.
// "TikTok Shop Pro" is the factory default.

export interface BuiltinTemplate {
  name: string
  html: string
  css: string
}

const TIKTOK_SHOP_PRO: BuiltinTemplate = {
  name: "TikTok Shop Pro",
  html: `<div class="packing-slip pro">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>PACKING SLIP</h1>
      <p class="order-number">ORDER #{{order_number}}</p>
      <p class="date">DATE: {{date}}</p>
      <p class="username">Customer Username: {{customer_username}}</p>
    </div>
    <div class="header-right">
      <p class="label">Ship To</p>
      <p class="customer-name">{{customer_name}}</p>
      <p class="customer-phone">{{customer_phone}}</p>
      <p class="customer-address">{{customer_address}}</p>
    </div>
  </div>

  <!-- Summary -->
  <div class="summary">
    <div><span>{{total_orders}}</span><p>Total Orders</p></div>
    <div><span>{{total_products}}</span><p>Total Products</p></div>
    <div><span>{{total_items}}</span><p>Total Items</p></div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Image</th>
        <th>Product</th>
        <th>SKU</th>
        <th>Seller SKU</th>
        <th>Qty</th>
        <th>Order ID</th>
      </tr>
    </thead>
    <tbody>
      {{#items}}
      <tr>
        <td>{{item_index}}</td>
        <td>
          <img src="{{item_image_url}}" alt="Product"
               onerror="this.onerror=null;this.src='https://placehold.co/60x60/f0f0f0/ccc?text=No+Img';"/>
        </td>
        <td>{{item_name}}</td>
        <td>{{item_sku}}</td>
        <td>{{item_seller_sku}}</td>
        <td>{{item_quantity}}</td>
        <td>{{item_order_id}}</td>
      </tr>
      {{/items}}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <p class="footer-text">Thank you for your order!</p>
    <img src="https://cdn.shopify.com/s/files/1/0556/0359/3529/files/tts_logo.png?v=1746866929"
         alt="TikTok Shop Logo" class="footer-logo"/>
  </div>
</div>`,
  css: `/* ============ Base / Container ============ */
.packing-slip.pro {
  max-width: 850px;
  margin: 30px auto;
  padding: 32px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.06);
  font-family: 'Segoe UI', Arial, sans-serif;
  color: #1a202c;
}

/* ============ Header ============ */
.header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 18px;
  margin-bottom: 20px;
}
.header-left h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #111827;
}
.header-left p { margin: 4px 0; font-size: 14px; color: #4b5563; }
.header-left .order-number { font-weight: 600; color: #111827; }
.header-right { text-align: right; font-size: 14px; line-height: 1.6; }
.header-right .label {
  font-size: 11px; font-weight: 600; color: #6b7280;
  text-transform: uppercase; margin-bottom: 5px;
}
.customer-name { font-weight: 600; font-size: 16px; color: #111827; }

/* ============ Summary ============ */
.summary {
  display: flex;
  justify-content: space-around;
  gap: 12px;
  background: linear-gradient(135deg, #f9fafb, #f3f4f6);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 24px;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.03);
}
.summary div { text-align: center; flex: 1; }
.summary span { font-size: 22px; font-weight: 700; color: #111827; display: block; }
.summary p { font-size: 13px; color: #6b7280; margin: 0; }

/* ============ Items Table ============ */
.items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
.items-table th, .items-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 14px;
  font-size: 13px;
  vertical-align: middle;
}
.items-table th {
  text-transform: uppercase;
  font-size: 12px;
  color: #4b5563;
  background: #f3f4f6;
}
.items-table tr:nth-child(even) { background: #fafafa; }
.items-table img {
  max-width: 60px;
  max-height: 60px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  object-fit: cover;
}

/* ============ Footer (Left text, Right logo) ============ */
.footer {
  border-top: 2px solid #f1f5f9;
  padding-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;     /* perfect vertical alignment */
  gap: 12px;
}
.footer-text {
  margin: 0;
  font-size: 18px;         /* bigger for balance */
  font-weight: 600;        /* a bit bolder */
  color: #111827;          /* darker for visual weight */
  line-height: 1.2;
}
.footer-logo {
  max-height: 34px;
  height: auto;
  width: auto;
  opacity: 0.95;
}

/* ============ Address Formatting ============ */
.customer-address {
  white-space: pre-line; /* respects \\n */
}

/* ============ Responsive Tweaks ============ */
@media (max-width: 640px) {
  .packing-slip.pro { padding: 20px; }
  .header { flex-direction: column; text-align: left; }
  .header-right { text-align: left; }
  .summary { flex-direction: column; gap: 8px; }
  .footer-text { font-size: 17px; }
  .footer-logo { max-height: 38px; }
}

/* ============ Print Styles ============ */
@media print {
  .packing-slip.pro {
    box-shadow: none;
    border: none;
    margin: 0;
    max-width: 100%;
    padding: 0;
  }
  .items-table th, .items-table td { padding: 8px 10px; }
  .footer-logo { max-height: 36px; }
}`,
}

const GROW_NEST_CLASSIC: BuiltinTemplate = {
  name: "Grow Nest Classic",
  html: `<div class="slip gn-classic">
  <div class="gn-head">
    <div class="gn-brand">
      <div class="gn-mark">◉</div>
      <div>
        <p class="gn-name">Grow Nest</p>
        <p class="gn-tag">WHERE DIGITAL GROWTH TAKES FLIGHT</p>
      </div>
    </div>
    <div class="gn-doc">
      <p class="gn-doc-title">PACKING SLIP</p>
      <p class="gn-doc-no">#{{order_number}}</p>
      <p class="gn-doc-date">{{date}}</p>
    </div>
  </div>

  <div class="gn-cols">
    <div class="gn-col">
      <p class="gn-label">Deliver to</p>
      <p class="gn-cust">{{customer_name}}</p>
      <p class="gn-addr">{{customer_address}}</p>
      <p class="gn-meta">{{customer_phone}}</p>
    </div>
    <div class="gn-col gn-order">
      <p class="gn-label">Order</p>
      <table class="gn-meta-table">
        <tr><td>Reference</td><td>{{order_number}}</td></tr>
        <tr><td>Buyer</td><td>{{customer_username}}</td></tr>
        <tr><td>Items</td><td>{{total_items}}</td></tr>
        <tr><td>Total weight</td><td>{{total_weight}} kg</td></tr>
      </table>
    </div>
  </div>

  <table class="gn-items">
    <thead>
      <tr><th>#</th><th>SKU</th><th>Description</th><th class="r">Qty</th><th class="r">Weight</th></tr>
    </thead>
    <tbody>
      {{#items}}
      <tr>
        <td>{{item_index}}</td>
        <td class="mono">{{item_seller_sku}}</td>
        <td>{{item_name}}</td>
        <td class="r">{{item_quantity}}</td>
        <td class="r">{{item_weight}}</td>
      </tr>
      {{/items}}
    </tbody>
    <tfoot>
      <tr><td colspan="3">TOTAL</td><td class="r">{{total_items}}</td><td class="r">{{total_weight}}</td></tr>
    </tfoot>
  </table>

  <div class="gn-foot">
    <div class="gn-sign">
      <div class="gn-sign-line"></div>
      <p>Packed &amp; checked by</p>
    </div>
    <p class="gn-thanks">Thank you for growing with us 🌱</p>
  </div>
</div>`,
  css: `.slip.gn-classic {
  max-width: 820px; margin: 30px auto; padding: 40px 44px;
  background: #FDFBF7; color: #1c1917;
  font-family: Georgia, 'Times New Roman', serif;
  border: 1px solid #e7e0d2;
}
.gn-head { display: flex; justify-content: space-between; align-items: flex-start;
  border-bottom: 2px solid #1c1917; padding-bottom: 18px; }
.gn-brand { display: flex; gap: 12px; align-items: center; }
.gn-mark { width: 44px; height: 44px; border: 2px solid #1c1917; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 18px; }
.gn-name { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.01em; }
.gn-tag { margin: 2px 0 0; font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 0.22em; color: #78716c; }
.gn-doc { text-align: right; }
.gn-doc-title { margin: 0; font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 0.3em; color: #78716c; }
.gn-doc-no { margin: 4px 0 0; font-size: 20px; font-weight: 600; }
.gn-doc-date { margin: 2px 0 0; font-family: 'Courier New', monospace; font-size: 11px; color: #78716c; }
.gn-cols { display: flex; gap: 32px; margin: 24px 0; }
.gn-col { flex: 1; }
.gn-label { font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.24em;
  text-transform: uppercase; color: #78716c; margin: 0 0 8px; }
.gn-cust { font-size: 20px; margin: 0 0 6px; font-weight: 600; }
.gn-addr { margin: 0 0 6px; line-height: 1.5; white-space: pre-line; }
.gn-meta { font-family: 'Courier New', monospace; font-size: 12px; color: #57534e; margin: 0; }
.gn-meta-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.gn-meta-table td { padding: 5px 0; border-bottom: 1px solid #e7e0d2; }
.gn-meta-table td:last-child { text-align: right; font-family: 'Courier New', monospace; }
.gn-items { width: 100%; border-collapse: collapse; margin: 8px 0 28px; font-size: 13px; }
.gn-items th { font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.18em;
  text-transform: uppercase; color: #78716c; text-align: left; border-bottom: 2px solid #1c1917; padding: 8px 6px; }
.gn-items td { padding: 10px 6px; border-bottom: 1px solid #e7e0d2; vertical-align: top; }
.gn-items .r { text-align: right; }
.gn-items .mono { font-family: 'Courier New', monospace; font-size: 12px; }
.gn-items tfoot td { border-bottom: none; border-top: 2px solid #1c1917;
  font-weight: 700; font-size: 14px; padding-top: 12px; }
.gn-foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
.gn-sign-line { width: 220px; border-bottom: 1px solid #1c1917; height: 34px; }
.gn-sign p { font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.18em;
  text-transform: uppercase; color: #78716c; margin: 6px 0 0; }
.gn-thanks { font-style: italic; color: #57534e; margin: 0; }
@media print {
  .slip.gn-classic { border: none; margin: 0; max-width: 100%; padding: 10mm 8mm; }
}`,
}

const MINIMAL_MONO: BuiltinTemplate = {
  name: "Minimal Mono",
  html: `<div class="slip mono-slip">
  <div class="mm-top">
    <p class="mm-kicker">PACKING SLIP · {{date}}</p>
    <p class="mm-order">#{{order_number}}</p>
  </div>

  <div class="mm-grid">
    <div>
      <p class="mm-label">SHIP TO</p>
      <p class="mm-strong">{{customer_name}}</p>
      <p class="mm-addr">{{customer_address}}</p>
      <p class="mm-dim">{{customer_phone}}</p>
    </div>
    <div class="mm-right">
      <p class="mm-label">SUMMARY</p>
      <p class="mm-dim">BUYER — {{customer_username}}</p>
      <p class="mm-dim">ORDERS — {{total_orders}}</p>
      <p class="mm-dim">ITEMS — {{total_items}}</p>
      <p class="mm-dim">WEIGHT — {{total_weight}} KG</p>
    </div>
  </div>

  <table class="mm-items">
    <thead>
      <tr><th>NO</th><th>SKU</th><th>DESCRIPTION</th><th class="r">QTY</th></tr>
    </thead>
    <tbody>
      {{#items}}
      <tr>
        <td>{{item_index}}</td>
        <td>{{item_seller_sku}}</td>
        <td>{{item_name}}</td>
        <td class="r">{{item_quantity}}</td>
      </tr>
      {{/items}}
    </tbody>
  </table>

  <div class="mm-bottom">
    <p>TOTAL {{total_items}} ITEMS · {{total_weight}} KG</p>
    <p>THANK YOU</p>
  </div>
</div>`,
  css: `.slip.mono-slip {
  max-width: 780px; margin: 30px auto; padding: 36px 40px;
  background: #ffffff; color: #111111;
  font-family: 'Courier New', Courier, monospace; font-size: 13px;
  border: 1px solid #111111;
}
.mm-top { display: flex; justify-content: space-between; align-items: baseline;
  border-bottom: 3px double #111; padding-bottom: 12px; }
.mm-kicker { margin: 0; font-size: 11px; letter-spacing: 0.28em; }
.mm-order { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.04em; }
.mm-grid { display: flex; justify-content: space-between; gap: 24px; padding: 20px 0; }
.mm-right { text-align: right; }
.mm-label { font-size: 10px; letter-spacing: 0.28em; color: #666; margin: 0 0 8px; }
.mm-strong { font-size: 16px; font-weight: 700; margin: 0 0 6px; }
.mm-addr { margin: 0 0 6px; line-height: 1.6; white-space: pre-line; max-width: 320px; }
.mm-dim { color: #444; margin: 0 0 4px; }
.mm-items { width: 100%; border-collapse: collapse; }
.mm-items th { text-align: left; font-size: 10px; letter-spacing: 0.22em;
  border-top: 1px solid #111; border-bottom: 1px solid #111; padding: 8px 6px; }
.mm-items td { padding: 9px 6px; border-bottom: 1px dashed #bbb; vertical-align: top; }
.mm-items .r { text-align: right; }
.mm-bottom { display: flex; justify-content: space-between;
  border-top: 3px double #111; margin-top: 4px; padding-top: 12px;
  font-size: 12px; letter-spacing: 0.14em; }
.mm-bottom p { margin: 0; }
@media print {
  .slip.mono-slip { border: none; margin: 0; max-width: 100%; padding: 8mm 6mm; }
}`,
}

const COMPACT_A5: BuiltinTemplate = {
  name: "Compact A5",
  html: `<div class="slip a5-slip">
  <div class="a5-main">
    <div class="a5-head">
      <div>
        <p class="a5-title">PACKING SLIP</p>
        <p class="a5-no">#{{order_number}}</p>
      </div>
      <p class="a5-date">{{date}}</p>
    </div>

    <div class="a5-to">
      <p class="a5-label">DELIVER TO</p>
      <p class="a5-name">{{customer_name}}</p>
      <p class="a5-addr">{{customer_address}}</p>
      <p class="a5-phone">{{customer_phone}}</p>
    </div>

    <table class="a5-items">
      {{#items}}
      <tr>
        <td class="q">{{item_quantity}}×</td>
        <td>{{item_name}}</td>
        <td class="sku">{{item_seller_sku}}</td>
      </tr>
      {{/items}}
    </table>

    <p class="a5-total">{{total_items}} items · {{total_weight}} kg</p>
  </div>

  <div class="a5-side">
    <div class="a5-qr">
      <div class="a5-qr-frame">
        <span class="a5-qr-corner tl"></span><span class="a5-qr-corner tr"></span>
        <span class="a5-qr-corner bl"></span><span class="a5-qr-corner br"></span>
        <p>QR<br/>SLOT</p>
      </div>
      <p class="a5-qr-ref">{{order_number}}</p>
    </div>
    <p class="a5-brand">GROW NEST</p>
  </div>
</div>`,
  css: `.slip.a5-slip {
  max-width: 760px; margin: 30px auto; min-height: 380px;
  display: flex; background: #fff; color: #17171a;
  font-family: Arial, Helvetica, sans-serif; font-size: 12px;
  border: 1px solid #d4d4d8;
}
.a5-main { flex: 1; padding: 22px 24px; display: flex; flex-direction: column; }
.a5-head { display: flex; justify-content: space-between; align-items: flex-start;
  border-bottom: 2px solid #17171a; padding-bottom: 10px; margin-bottom: 14px; }
.a5-title { margin: 0; font-size: 10px; letter-spacing: 0.3em; color: #71717a; }
.a5-no { margin: 3px 0 0; font-size: 17px; font-weight: 700; }
.a5-date { margin: 0; font-family: 'Courier New', monospace; font-size: 11px; color: #71717a; }
.a5-label { margin: 0 0 4px; font-size: 9px; letter-spacing: 0.26em; color: #71717a; }
.a5-name { margin: 0 0 3px; font-size: 15px; font-weight: 700; }
.a5-addr { margin: 0 0 3px; line-height: 1.45; white-space: pre-line; }
.a5-phone { margin: 0; font-family: 'Courier New', monospace; font-size: 11px; color: #52525b; }
.a5-items { width: 100%; border-collapse: collapse; margin: 14px 0 10px; }
.a5-items td { padding: 6px 4px; border-bottom: 1px solid #e4e4e7; vertical-align: top; }
.a5-items .q { width: 34px; font-weight: 700; white-space: nowrap; }
.a5-items .sku { text-align: right; font-family: 'Courier New', monospace; font-size: 10px; color: #71717a; white-space: nowrap; }
.a5-total { margin: auto 0 0; padding-top: 8px; border-top: 2px solid #17171a;
  font-weight: 700; font-size: 13px; }
.a5-side { width: 168px; border-left: 1px dashed #a1a1aa; padding: 22px 16px;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
.a5-qr { text-align: center; }
.a5-qr-frame { position: relative; width: 110px; height: 110px; margin: 0 auto;
  display: flex; align-items: center; justify-content: center;
  background: #fafafa; }
.a5-qr-frame p { margin: 0; font-family: 'Courier New', monospace; font-size: 11px;
  letter-spacing: 0.2em; color: #a1a1aa; line-height: 1.6; }
.a5-qr-corner { position: absolute; width: 16px; height: 16px; border: 2px solid #17171a; }
.a5-qr-corner.tl { top: 0; left: 0; border-right: none; border-bottom: none; }
.a5-qr-corner.tr { top: 0; right: 0; border-left: none; border-bottom: none; }
.a5-qr-corner.bl { bottom: 0; left: 0; border-right: none; border-top: none; }
.a5-qr-corner.br { bottom: 0; right: 0; border-left: none; border-top: none; }
.a5-qr-ref { margin: 8px 0 0; font-family: 'Courier New', monospace; font-size: 9px;
  color: #71717a; word-break: break-all; max-width: 130px; }
.a5-brand { margin: 0; font-size: 10px; letter-spacing: 0.3em; color: #71717a; }
@media print {
  .slip.a5-slip { border: none; margin: 0; max-width: 100%; }
}`,
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [TIKTOK_SHOP_PRO, GROW_NEST_CLASSIC, MINIMAL_MONO, COMPACT_A5]

export const DEFAULT_TEMPLATE_NAME = TIKTOK_SHOP_PRO.name

const SEED_VERSION_KEY = "builtinTemplatesSeedVersion"
const SEED_VERSION = "1"

// Adds any missing built-in templates to localStorage (never overwrites a
// template the user has edited under the same name) and, once per seed
// version, sets "TikTok Shop Pro" as the default template.
export function seedBuiltinTemplates(): void {
  if (typeof window === "undefined") return
  try {
    const stored: BuiltinTemplate[] = JSON.parse(localStorage.getItem("customTemplates") || "[]")
    const names = new Set(stored.map((t) => t.name))
    let changed = false
    for (const template of BUILTIN_TEMPLATES) {
      if (!names.has(template.name)) {
        stored.push(template)
        changed = true
      }
    }
    if (changed) {
      localStorage.setItem("customTemplates", JSON.stringify(stored))
    }
    if (localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
      localStorage.setItem("defaultTemplate", DEFAULT_TEMPLATE_NAME)
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION)
    }
  } catch (error) {
    console.error("Failed to seed built-in templates:", error)
  }
}
