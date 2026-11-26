// Local ERP stand-in for frontend transport/UI checks. Business rules are tested
// by the real OfferService + PricingService in the backend discount-coverage.spec.ts.
const http = require('node:http')
const id = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`
const writes = []
let failNext = false
let delayNext = 0
let offer = null
const stores = [{ storeID: id(1), name: 'Central', onlineEnabled: false }, { storeID: id(2), name: 'Sucursal web', onlineEnabled: true }]
http.createServer(async (request, response) => {
    response.setHeader('access-control-allow-origin', '*')
    response.setHeader('access-control-allow-headers', 'authorization,content-type')
    response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
    if (request.method === 'OPTIONS') { response.writeHead(204); return response.end() }
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const text = Buffer.concat(chunks).toString('utf8')
    const body = text ? JSON.parse(text) : {}
    const send = (status, data) => {
        response.writeHead(status, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ statusCode: status, ...(status < 400 ? { data } : { message: data }) }))
    }
    if (request.url === '/__state') return send(200, { writes, offer })
    if (request.url === '/__control') {
        failNext = body.failNext ?? false
        delayNext = body.delayNext ?? 0
        return send(200, { failNext, delayNext })
    }
    let identity
    const token = (request.headers.authorization || '').replace(/^Bearer /, '')
    try { identity = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) } catch { identity = { type: 'tenant', role: token === 'discount-admin' ? 'admin' : 'store_manager', tenantId: 'fixture' } }
    if (!token) return send(401, 'Inicia sesión')
    if (request.url !== '/pricing/calculate-cart' && !(identity.type === 'tenant' && identity.role === 'admin') && !(identity.type === 'master' && identity.impersonatingTenantId)) return send(403, 'Necesitas administrar una empresa activa')
    if (failNext) { failNext = false; return send(403, 'El descuento no se pudo guardar') }
    const delay = delayNext
    delayNext = 0
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
    if (request.url === '/pricing/offer-options' && request.method === 'GET') return send(200, { stores, salesChannels: ['PHYSICAL', 'ONLINE'] })
    if (request.url === '/pricing/offers' && request.method === 'GET') return send(200, offer ? [offer] : [])
    if ((request.url === '/pricing/offers' || request.url === '/pricing/offers/' + id(20)) && request.method === 'POST') {
        writes.push({ method: request.method, path: request.url, body })
        offer = { ...(request.url === '/pricing/offers' ? {} : offer), ...body, offerID: id(20), createdAt: '2026-11-12T00:00:00Z', updatedAt: '2026-11-12T00:00:00Z' }
        return send(201, offer)
    }
    if (request.url === '/pricing/calculate-cart' && request.method === 'POST') {
        // Recorded second-unit responses, not an alternative pricing engine.
        // Prices and expected results are established by the paired backend tests.
        if (body.items.some((item) => item.storeProductID === id(41) || item.storeProductID === id(42))) {
            const single = body.items.length === 1 && body.items[0].storeProductID === id(41) && body.items[0].quantity === 1
            const pair = body.items.length === 2 && body.items.every((item) => [id(41), id(42)].includes(item.storeProductID) && item.quantity === 1)
            if (!single && !pair) return send(501, 'Second-unit scenario not recorded')
            const recordedCheapPrice = offer?.value === 80 ? 4000 : offer?.value === 50 ? 10000 : null
            if (!single && (offer?.discountType !== 'SECOND_UNIT_PERCENTAGE' || recordedCheapPrice === null)) return send(501, 'Second-unit percentage not recorded')
            const items = body.items.map((item) => {
                const expensive = item.storeProductID === id(41)
                const baseUnitPrice = expensive ? 30000 : 20000
                const lineTotal = expensive ? 30000 : recordedCheapPrice
                return { ...item, baseUnitPrice, finalUnitPrice: lineTotal, lineTotal,
                    discountsApplied: expensive ? [] : [{ source: 'AUTO', applied: true, offerID: id(20),
                        description: 'Segunda unidad de prueba', discountType: 'SECOND_UNIT_PERCENTAGE', value: offer.value }] }
            })
            const subtotal = single ? 30000 : 50000
            const total = single ? 30000 : 30000 + recordedCheapPrice
            return send(201, { items, totals: { subtotal, total, discount: subtotal - total }, pricingContext: { storeID: body.storeID, pricingDate: '2026-11-26T12:00:00Z' } })
        }
        // Recorded totals for scenarios covered by the real backend service tests.
        const quantities = new Map(body.items.map((item) => [item.storeProductID, item.quantity]))
        const pair = quantities.get(id(11)) === 1 && quantities.get(id(12)) === 1
        const doublePair = quantities.get(id(11)) === 2 && quantities.get(id(12)) === 2
        const items = body.items.map((item) => {
            const baseUnitPrice = item.storeProductID === id(11) ? 1000 : 2000
            const free = item.storeProductID === id(11) && (pair || doublePair)
            return { ...item, baseUnitPrice, finalUnitPrice: free ? 0 : baseUnitPrice,
                lineTotal: free ? 0 : baseUnitPrice * item.quantity,
                discountsApplied: free ? [{ source: 'AUTO', applied: true, offerID: id(20), description: '2x1 de prueba' }] : [] }
        })
        const subtotal = items.reduce((sum, item) => sum + item.baseUnitPrice * item.quantity, 0)
        const total = items.reduce((sum, item) => sum + item.lineTotal, 0)
        return send(201, { items, totals: { subtotal, total, discount: subtotal - total }, pricingContext: { storeID: body.storeID, pricingDate: '2026-11-12T12:00:00Z' } })
    }
    return send(501, 'Path outside this fixture contract')
}).listen(process.env.PORT)
