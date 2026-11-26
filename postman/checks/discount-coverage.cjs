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
    for (const selection of [
        { targetScope: 'STORE' },
        { targetScope: 'CATEGORY', categoryID: id(30), includeSubcategories: true },
        { targetScope: 'BRAND', brand: 'Marca de prueba' },
        { targetScope: 'PRODUCT', productIDs: [id(31), id(32)] },
    ]) {
        const secondUnit = { ...selection, storeID: id(1), storeIDs: [id(1), id(2)],
            salesChannels: ['PHYSICAL', 'ONLINE'], discountType: 'SECOND_UNIT_PERCENTAGE', value: 80,
            exclusive: true, allowBelowMargin: false, isActive: true, startDate: '2026-11-26T00:00:00Z' }
        const saved = await createOffer(secondUnit)
        assert.equal(saved.discountType, 'SECOND_UNIT_PERCENTAGE')
        assert.equal(saved.value, 80)
        assert.equal(saved.targetScope, selection.targetScope)
        const cart = { storeID: id(1), items: [{ storeProductID: id(41), quantity: 1 }, { storeProductID: id(42), quantity: 1 }] }
        const quote80 = await calculateCart(cart)
        assert.deepEqual(quote80.totals, { subtotal: 50000, total: 34000, discount: 16000 })
        assert.equal(quote80.items[0].lineTotal, 30000)
        assert.equal(quote80.items[1].lineTotal, 4000)
        const edited = await updateOffer(saved.offerID, { value: 50 })
        assert.equal(edited.value, 50)
        assert.equal(edited.targetScope, selection.targetScope)
        assert.equal((await calculateCart(cart)).totals.total, 40000)
        const single = await calculateCart({ ...cart, items: [cart.items[0]] })
        assert.equal(single.totals.total, 30000)
    }
    const secondUnitState = (await (await fetch(base + '/__state')).json()).data
    const newWrites = secondUnitState.writes.slice(2)
    assert.equal(newWrites.length, 8)
    for (const write of newWrites.filter((_, index) => index % 2 === 0)) {
        assert.equal(write.body.discountType, 'SECOND_UNIT_PERCENTAGE')
        assert.equal(write.body.value, 80)
        assert.ok(!('buyQuantity' in write.body) && !('payQuantity' in write.body))
    }
    console.log(JSON.stringify({ createAndUpdateTransport: true, coverageAndProductsPreserved: true, cartResponse: true, rejectionSurfaced: true, masterImpersonation: true, secondUnitScopes: 4, editablePercentage: true, recordedPairAndSingleResponses: true }))
})().catch((error) => { console.error(error); process.exitCode = 1 })
