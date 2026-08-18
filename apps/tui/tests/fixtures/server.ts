import type { Server } from "bun";

export interface TestServer {
	server: Server<undefined>;
	url: (path?: string) => string;
	close: () => void;
}

const PAGES: Record<string, string> = {
	"/": `
    <!DOCTYPE html>
    <html>
      <head><title>CDP Test Server</title></head>
      <body>
        <h1 id="title">Automation Control Center</h1>
        <p id="desc">Precision direct CDP automation engine</p>
      </body>
    </html>
  `,

	"/disambiguation": `
    <!DOCTYPE html>
    <html>
      <head><title>Disambiguation Test</title></head>
      <body>
        <div id="output">idle</div>
        <button id="btn-exact" onclick="document.getElementById('output').innerText = 'btn_exact';">Save</button>
        <button id="btn-all" onclick="document.getElementById('output').innerText = 'btn_all';">Save All</button>
        <button id="btn-changes" onclick="document.getElementById('output').innerText = 'btn_changes';">Save Changes</button>
        <a id="doc-link" href="/docs" onclick="event.preventDefault(); document.getElementById('output').innerText = 'link_clicked';">Documentation</a>
      </body>
    </html>
  `,

	"/forms": `
    <!DOCTYPE html>
    <html>
      <head><title>Forms Automation</title></head>
      <body>
        <form onsubmit="event.preventDefault(); document.getElementById('status').innerText = 'SAVED:' + document.getElementById('user-email').value + ':' + document.getElementById('auth-token').value;">
          <input id="user-email" placeholder="Work Email" value="old@domain.com" />
          <input id="auth-token" aria-label="Secret Authentication Code" value="" />
          <input id="quantity" type="number" placeholder="Order Quantity" value="1" />
          <textarea id="notes" placeholder="Order Notes"></textarea>
          <button id="btn-save" type="submit">Save Profile Settings</button>
        </form>
        <div id="status">UNSAVED</div>
      </body>
    </html>
  `,

	"/async": `
    <!DOCTYPE html>
    <html>
      <head><title>Async DOM Mutation</title></head>
      <body>
        <div id="async-banner">Initial Loading State</div>
        <script>
          setTimeout(() => {
            document.getElementById('async-banner').innerText = 'Async Operation Finished';
          }, 150);
        </script>
      </body>
    </html>
  `,

	"/inventory": `
    <!DOCTYPE html>
    <html>
      <head><title>Inventory Table</title></head>
      <body>
        <div id="session-badge" data-tenant="CORP-900">TENANT-CORP-900</div>
        <table>
          <thead><tr><th>SKU</th><th>Tier</th><th>Product</th><th>Action</th></tr></thead>
          <tbody>
            <tr class="inv-row"><td class="sku">SKU-A1</td><td class="tier">Enterprise</td><td class="name">Direct Server</td><td><a href="/buy/101">Order</a></td></tr>
            <tr class="inv-row"><td class="sku">SKU-A2</td><td class="tier">Standard</td><td class="name">CDP License</td><td><a href="/buy/102">Order</a></td></tr>
            <tr class="inv-row"><td class="sku">SKU-A3</td><td class="tier">Enterprise</td><td class="name">Compute Blade</td><td><a href="/buy/103">Order</a></td></tr>
          </tbody>
        </table>
      </body>
    </html>
  `,

	"/boundaries": `
    <!DOCTYPE html>
    <html>
      <head><title>Strict Boundaries</title></head>
      <body>
        <div id="chip-status" data-code="ST-200">  Payment Complete (Order #883)  </div>
        <div id="chip-exact">Order Approved</div>
        <span id="price-tag">$499.00</span>
      </body>
    </html>
  `,

	"/text-cases": `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Text Case & Normalization Test</title>
        <style>
          .uppercase-css { text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div id="output">none</div>
        <button id="btn-submit" onclick="document.getElementById('output').innerText = 'SUBMIT_CLICKED';">Submit Application</button>
        <button id="btn-cancel" onclick="document.getElementById('output').innerText = 'CANCEL_CLICKED';">CANCEL NOW</button>
        <button id="btn-css-cased" class="uppercase-css" onclick="document.getElementById('output').innerText = 'CSS_CASED_CLICKED';">mixed Case Text</button>
        
        <div id="multiline-message">
          Welcome
          Back,
          Enterprise User!
        </div>

        <div id="invoice-id">Invoice #INV-2026-8842-OK</div>
        <span id="version-tag">Build v2.10.4-beta (rev 9811)</span>

        <form onsubmit="event.preventDefault(); document.getElementById('output').innerText = 'FORM:' + document.getElementById('coupon').value;">
          <input id="coupon" placeholder="ENTER PROMO CODE" aria-label="Customer Discount Voucher" />
          <button id="btn-apply" type="submit">Apply Discount</button>
        </form>
      </body>
    </html>
  `,
};

export function startTestServer(): TestServer {
	const server = Bun.serve({
		port: 0, // Random available port
		hostname: "127.0.0.1",
		fetch(req) {
			const url = new URL(req.url);
			const html = PAGES[url.pathname];
			if (html) {
				return new Response(html, {
					headers: { "Content-Type": "text/html; charset=utf-8" },
				});
			}
			return new Response("Not Found", { status: 404 });
		},
	});

	return {
		server,
		url: (path = "/") => `http://127.0.0.1:${server.port}${path}`,
		close: () => server.stop(true),
	};
}
