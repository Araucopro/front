// Real frontend domain actions and fetcher over local HTTP. No live writes.
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')
const src = path.resolve(__dirname, '../../src')
const base = process.env.DISCOUNT_SIMULATION_URL || 'http://127.0.0.1:4903/erp'
assert.equal(new URL(base).hostname, '127.0.0.1')
process.env.NEXT_PUBLIC_API_URL = base
global.window = {}
global.document = { cookie: 'auth_token=discount-admin' }
const resolve = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...args) {
    return resolve.call(this, request.startsWith('@/') ? path.join(src, request.slice(2)) : request, parent, ...args)
}
Module._extensions['.ts'] = function (module, file) {
    module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    } }).outputText, file)
}
const { getOfferOptions } = require(path.join(src, 'actions/pricing/getOfferOptions.ts'))
const { createOffer } = require(path.join(src, 'actions/pricing/createOffer.ts'))
const { updateOffer } = require(path.join(src, 'actions/pricing/updateOffer.ts'))
const { calculateCart } = require(path.join(src, 'actions/pricing/calculateCart.ts'))
const id = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`
;(async () => {
    const options = await getOfferOptions()
    assert.equal(options.stores[1].onlineEnabled, true)
    const payload = { targetScope: 'PRODUCT', storeID: id(1), storeIDs: [id(1), id(2)], salesChannels: ['PHYSICAL', 'ONLINE'], productIDs: [id(31), id(32)], discountType: 'BUY_X_GET_Y', buyQuantity: 2, payQuantity: 1, value: 0, isActive: true, allowBelowMargin: true, startDate: '2026-11-12T00:00:00Z' }
    const offer = await createOffer(payload)
    assert.deepEqual(offer.storeIDs, payload.storeIDs)
    assert.deepEqual(offer.salesChannels, payload.salesChannels)
    assert.deepEqual(offer.productIDs, payload.productIDs)
    await updateOffer(offer.offerID, { isActive: false })
    const quote = await calculateCart({ storeID: id(1), items: [{ storeProductID: id(11), quantity: 1 }, { storeProductID: id(12), quantity: 1 }] })
    assert.equal(quote.totals.total, 2000)
    assert.equal(quote.items[0].lineTotal, 0)
    const control = await fetch(base + '/__control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ failNext: true }) })
    assert.equal(control.ok, true)
    await assert.rejects(createOffer(payload), /no se pudo guardar/)
    global.document.cookie = 'auth_token=discount-seller'
    await assert.rejects(createOffer(payload), /administrar una empresa/)
    global.document.cookie = 'auth_token=' + ['fixture', Buffer.from(JSON.stringify({ type: 'master', impersonatingTenantId: 'fixture' })).toString('base64url'), 'fixture'].join('.')
    await getOfferOptions()
    const state = (await (await fetch(base + '/__state')).json()).data
    assert.deepEqual(state.writes[0].body, payload)
    assert.equal(state.writes.length, 2, 'Rejected writes must not be recorded')
    console.log(JSON.stringify({ createAndUpdateTransport: true, coverageAndProductsPreserved: true, cartResponse: true, rejectionSurfaced: true, masterImpersonation: true }))
})().catch((error) => { console.error(error); process.exitCode = 1 })
