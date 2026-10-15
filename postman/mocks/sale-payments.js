// Sales contract verified against published /docs-json on 2026-10-15.
// commerce is the additive response defined in the local ERP SaleDto.
const http = require('node:http')
const storeID = '00000000-0000-4000-8000-000000000002'
const stamp = '2026-10-15T20:40:00.000Z'
const provider = (paymentProvider) => ({origin:'WEB',paymentProvider,isTest:true})
const sales = [
  {saleID:'00000000-0000-4000-8000-000000000011',commerce:provider('mercadopago'),payments:[]},
  {saleID:'00000000-0000-4000-8000-000000000012',commerce:null,payments:[{paymentID:'pos-payment',paymentMethodID:'cash',paymentMethod:{paymentMethodID:'cash',code:'CASH',name:'Efectivo',type:'CASH'},amount:19990,status:'COMPLETED',paidAt:stamp}]},
  {saleID:'00000000-0000-4000-8000-000000000013',commerce:provider('another_provider'),payments:[]},
].map(sale=>({sale:{storeID,total:19990,saleType:'NOTA_VENTA',status:'EMITIDA',createdAt:stamp,items:[],store:{storeID,name:'Sucursal demo'},...sale},dte:null}))
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://fixture')
  const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}
  const ok=data=>send(200,{statusCode:200,message:'OK',error:null,data})
  if(req.headers.authorization!=='Bearer sales-demo')return send(401,{message:'Unauthorized'})
  if(req.headers['x-store-id']!==storeID)return send(403,{message:'Invalid store'})
  if(req.method==='GET'&&url.pathname==='/sales')return ok({sales,meta:{page:1,limit:50,total:sales.length}})
  if(req.method==='GET'&&url.pathname.startsWith('/sales/')){
    const sale=sales.find(sale=>sale.sale.saleID===url.pathname.slice('/sales/'.length))
    return sale?ok(sale):send(404,{message:'Sale not found'})
  }
  return send(501,{message:'Endpoint not modeled'})
}).listen(Number(process.env.PORT||0),'127.0.0.1')
