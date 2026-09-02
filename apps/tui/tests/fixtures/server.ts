import type { Server } from "bun";

export interface TestServer {
	server: Server<undefined>;
	url: (path?: string) => string;
	requestCount: (path: string) => number;
	close: () => void;
}

const PAGES: Record<string, string> = {
	"/": `<!DOCTYPE html><html><head><title>CDP Test Server</title></head><body><h1 id="title">Automation Control Center</h1><p id="desc">Precision direct CDP automation engine</p></body></html>`,
	"/disambiguation": `<!DOCTYPE html><html><head><title>Disambiguation Test</title></head><body><div id="output">idle</div><button id="btn-exact" onclick="document.getElementById('output').innerText = 'btn_exact';">Save</button><button id="btn-all" onclick="document.getElementById('output').innerText = 'btn_all';">Save All</button><button id="btn-changes" onclick="document.getElementById('output').innerText = 'btn_changes';">Save Changes</button><a id="doc-link" href="/docs" onclick="event.preventDefault(); document.getElementById('output').innerText = 'link_clicked';">Documentation</a></body></html>`,
	"/forms": `<!DOCTYPE html><html><head><title>Forms Automation</title></head><body><form onsubmit="event.preventDefault(); document.getElementById('status').innerText = 'SAVED:' + document.getElementById('user-email').value + ':' + document.getElementById('auth-token').value;"><input id="user-email" placeholder="Work Email" value="old@domain.com" /><input id="auth-token" aria-label="Secret Authentication Code" value="" /><input id="quantity" type="number" placeholder="Order Quantity" value="1" /><textarea id="notes" placeholder="Order Notes"></textarea><button id="btn-save" type="submit">Save Profile Settings</button></form><div id="status">UNSAVED</div></body></html>`,
	"/async": `<!DOCTYPE html><html><head><title>Async DOM Mutation</title></head><body><div id="async-banner">Initial Loading State</div><script>setTimeout(() => { document.getElementById('async-banner').innerText = 'Async Operation Finished'; }, 150);</script></body></html>`,
	"/inventory": `<!DOCTYPE html><html><head><title>Inventory Table</title></head><body><div id="session-badge" data-tenant="CORP-900">TENANT-CORP-900</div><table><thead><tr><th>SKU</th><th>Tier</th><th>Product</th><th>Action</th></tr></thead><tbody><tr class="inv-row"><td class="sku">SKU-A1</td><td class="tier">Enterprise</td><td class="name">Direct Server</td><td><a href="/buy/101">Order</a></td></tr><tr class="inv-row"><td class="sku">SKU-A2</td><td class="tier">Standard</td><td class="name">CDP License</td><td><a href="/buy/102">Order</a></td></tr><tr class="inv-row"><td class="sku">SKU-A3</td><td class="tier">Enterprise</td><td class="name">Compute Blade</td><td><a href="/buy/103">Order</a></td></tr></tbody></table></body></html>`,
	"/boundaries": `<!DOCTYPE html><html><head><title>Strict Boundaries</title></head><body><div id="chip-status" data-code="ST-200">  Payment Complete (Order #883)  </div><div id="chip-exact">Order Approved</div><span id="price-tag">$499.00</span></body></html>`,
	"/text-cases": `<!DOCTYPE html><html><head><title>Text Case & Normalization Test</title><style>.uppercase-css { text-transform: uppercase; }</style></head><body><div id="output">none</div><button id="btn-submit" onclick="document.getElementById('output').innerText = 'SUBMIT_CLICKED';">Submit Application</button><button id="btn-cancel" onclick="document.getElementById('output').innerText = 'CANCEL_CLICKED';">CANCEL NOW</button><button id="btn-css-cased" class="uppercase-css" onclick="document.getElementById('output').innerText = 'CSS_CASED_CLICKED';">mixed Case Text</button><div id="multiline-message">
          Welcome
          Back,
          Enterprise User!
        </div><div id="invoice-id">Invoice #INV-2026-8842-OK</div><span id="version-tag">Build v2.10.4-beta (rev 9811)</span><form onsubmit="event.preventDefault(); document.getElementById('output').innerText = 'FORM:' + document.getElementById('coupon').value;"><input id="coupon" placeholder="ENTER PROMO CODE" aria-label="Customer Discount Voucher" /><button id="btn-apply" type="submit">Apply Discount</button></form></body></html>`,
	"/iframes-main": `<!DOCTYPE html><html><head><title>Iframe Hub</title></head><body><h1 id="main-title">Top Level Portal</h1><iframe id="frame-login" name="loginFrame" src="/iframe-login" width="400" height="200"></iframe><iframe id="frame-checkout" name="checkoutFrame" src="/iframe-checkout" width="400" height="200"></iframe><iframe id="frame-spa" name="spaFrame" src="/iframe-spa-buttons" width="400" height="200"></iframe></body></html>`,
	"/iframe-login": `<!DOCTYPE html><html><head><title>Login Frame</title></head><body><h2 id="login-title">Secure Portal Login</h2><input id="frame-user" placeholder="Portal Username" /><button id="btn-login-submit" onclick="document.getElementById('frame-login-status').innerText = 'LOGGED_IN:' + document.getElementById('frame-user').value">Sign In</button><div id="frame-login-status">IDLE</div></body></html>`,
	"/iframe-checkout": `<!DOCTYPE html><html><head><title>Checkout Frame</title></head><body><h3 id="checkout-title">Credit Card Checkout</h3><input id="card-number" placeholder="Card Number" /><button id="btn-pay-now" onclick="document.getElementById('pay-status').innerText = 'PAID:' + document.getElementById('card-number').value">Pay Now</button><div id="pay-status">UNPAID</div></body></html>`,
	"/iframe-spa-buttons": `<!DOCTYPE html><html><head><title>SPA Buttons Frame</title></head><body><h2 id="spa-title">SPA Frame</h2><div id="spa-out">idle</div><button id="btn-pointer" class="btn-primary"><span>Pointer Action</span></button><button id="btn-mouse"><i class="icon"></i><span>Compose Email</span></button><div id="div-btn" role="button" tabindex="0">Custom Role Button</div><div id="shadow-host"></div><script>document.getElementById('btn-pointer').addEventListener('pointerdown', () => { document.getElementById('spa-out').innerText = 'POINTER_TRIGGERED'; }); document.getElementById('btn-mouse').addEventListener('mousedown', () => { document.getElementById('spa-out').innerText = 'MOUSEDOWN_TRIGGERED'; }); document.getElementById('div-btn').addEventListener('click', () => { document.getElementById('spa-out').innerText = 'ROLE_BTN_TRIGGERED'; }); const sh = document.getElementById('shadow-host').attachShadow({mode:'open'}); sh.innerHTML = '<button id="shadow-btn">Shadow Compose</button>'; sh.getElementById('shadow-btn').addEventListener('click', () => { document.getElementById('spa-out').innerText = 'SHADOW_TRIGGERED'; });</script></body></html>`,
	"/iframes-nested-parent": `<!DOCTYPE html><html><head><title>Nested Parent</title></head><body><h1 id="parent-heading">Parent Container</h1><iframe id="nested-child-frame" name="childFrame" src="/iframe-nested-child"></iframe></body></html>`,
	"/iframe-nested-child": `<!DOCTYPE html><html><head><title>Nested Child</title></head><body><h4 id="nested-heading">Deeply Nested Content</h4><button id="btn-deep" onclick="document.getElementById('deep-result').innerText = 'DEEP_TRIGGERED'">Execute Deep</button><div id="deep-result">deep-init</div></body></html>`,
	"/iframes-dynamic": `<!DOCTYPE html><html><head><title>Dynamic Frames</title></head><body><h1 id="dyn-heading">Dynamic Frames Hub</h1><button id="btn-add-iframe" onclick="const f = document.createElement('iframe'); f.id='dyn-frame'; f.name='dynFrame'; f.src='/iframe-login'; document.body.appendChild(f);">Add Frame</button><button id="btn-remove-iframe" onclick="document.getElementById('dyn-frame')?.remove();">Remove Frame</button></body></html>`,
	"/iframe-list": `<!DOCTYPE html><html><head><title>Iframe List</title></head><body><ul class="frame-list"><li class="f-item" data-code="C-101">Item Alpha</li><li class="f-item" data-code="C-102">Item Beta</li><li class="f-item" data-code="C-103">Item Gamma</li></ul></body></html>`,
	"/iframes-list-host": `<!DOCTYPE html><html><head><title>List Host</title></head><body><h1>Host Page</h1><iframe id="frame-list-host" name="listFrame" src="/iframe-list"></iframe></body></html>`,
	"/click-count": `<!DOCTYPE html><html><body><button id="count-button" onclick="window.clickCount=(window.clickCount||0)+1">Count Once</button></body></html>`,
	"/settle-submit": `<!DOCTYPE html><html><head><title>Settle Submit</title></head><body><form onsubmit="event.preventDefault(); setTimeout(() => { fetch('/settle-received', { method: 'POST', body: document.getElementById('settle-input').value }); }, 400);"><input id="settle-input" placeholder="Message" /><button id="btn-settle-send" type="submit">Send Delayed</button></form></body></html>`,
	"/resource-blocking": `<!DOCTYPE html><html><head><link rel="stylesheet" href="/asset.css"></head><body><img src="/asset.png"><script src="/asset.js"></script></body></html>`,
};

export function startTestServer(): TestServer {
	const requestCounts = new Map<string, number>();
	const server = Bun.serve({
		port: 0,
		hostname: "127.0.0.1",
		fetch(req) {
			const url = new URL(req.url);
			requestCounts.set(url.pathname, (requestCounts.get(url.pathname) || 0) + 1);
			const html = PAGES[url.pathname];
			if (html) {
				return new Response(html, {
					headers: { "Content-Type": "text/html; charset=utf-8" },
				});
			}
			if (url.pathname === "/asset.css") {
				return new Response("body { color: rgb(1, 2, 3); }", {
					headers: { "Content-Type": "text/css" },
				});
			}
			if (url.pathname === "/asset.js") {
				return new Response("window.assetScriptLoaded = true", {
					headers: { "Content-Type": "application/javascript" },
				});
			}
			if (url.pathname === "/asset.png") {
				return new Response(new Uint8Array([137, 80, 78, 71]), {
					headers: { "Content-Type": "image/png" },
				});
			}
			return new Response("Not Found", { status: 404 });
		},
	});

	return {
		server,
		url: (path = "/") => `http://127.0.0.1:${server.port}${path}`,
		requestCount: (path) => requestCounts.get(path) || 0,
		close: () => server.stop(true),
	};
}
