// Run real frontend actions over HTTP, with Postman providing the ERP.
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname,'../..')
const src = path.join(root,'src')
const base = process.env.SALES_SIMULATION_URL || 'http://127.0.0.1:4901/erp'
assert.equal(new URL(base).hostname,'127.0.0.1','Only a local simulation is allowed')
process.env.NEXT_PUBLIC_API_URL = base
global.window = {}
global.document = {cookie:'auth_token=sales-demo'}
const resolve = Module._resolveFilename
Module._resolveFilename = function(request,parent,...args) {
  return resolve.call(this,request.startsWith('@/')?path.join(src,request.slice(2)):request,parent,...args)
}
Module._extensions['.ts'] = function(module,file) {
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
  module._compile(js,file)
}
const {getSalesPage,getSingleSale}=require(path.join(src,'actions/sales/getSales.ts'))
const {getSalePaymentLabel,getSalePaymentBreakdown}=require(path.join(src,'utils/sale-payments.ts'))
;(async()=>{
  const storeID='00000000-0000-4000-8000-000000000002'
  const {sales}=await getSalesPage(storeID)
  assert.deepEqual(sales.map(getSalePaymentLabel),['Venta web \u00b7 Mercado Pago','Efectivo','Venta web \u00b7 another_provider'])
  const detail=await getSingleSale(sales[0].saleID,storeID)
  assert.equal(getSalePaymentLabel(detail),'Venta web · Mercado Pago')
  assert.deepEqual(getSalePaymentBreakdown(detail),[{label:'Venta web · Mercado Pago',amount:19990}])
  assert.equal(detail.payments.length,0)
  assert.equal(getSalePaymentLabel({payments:[],commerce:null}),'Sin dato')
  console.log(JSON.stringify({webAndPosList:true,webDetail:true,amountPreserved:true,noInventedCashPayment:true,otherProviders:true}))
})().catch(error=>{console.error(error);process.exitCode=1})
