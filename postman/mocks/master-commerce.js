// Fixture based on the published MasterCommerceController contract.
// All identities, tokens and changes belong only to this local mock.
const http = require("node:http")
const tenantID = "00000000-0000-4000-8000-000000000001"
const storeID = "00000000-0000-4000-8000-000000000002"
const stamp = "2026-10-15T20:00:00.000Z"
const tenant = {tenantID, name:"Tienda de prueba", slug:"tienda-prueba", status:"ACTIVE",
    maxStores:5, maxUsers:5, planType:"BASIC", subscriptionExpiresAt:null, autoRenew:false,
    timeZone:"America/Santiago", locale:"es-CL", createdAt:stamp, updatedAt:stamp, users:[],
    stores:[{storeID, tenantID, name:"Sucursal de prueba", location:"Temuco", rut:"",
        address:"Calle 1", city:"Temuco", phone:"", email:"", type:"CENTRAL",
        isCentralStore:true, createdAt:stamp, updatedAt:stamp}]}
const channels = [{channelID:"00000000-0000-4000-8000-000000000003",tenantID,storeID,
    code:"WEB_TEST", name:"Ecommerce de prueba", domain:"shop.example.test",active:true,
    salesEnabled:false,acceptTestPayments:false,createdAt:stamp,updatedAt:stamp}]
const writes = []
let failNext = false
http.createServer(async (req,res) => {
    const url = new URL(req.url,"http://fixture")
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks)) : {}
    const send = (code,data) => {res.writeHead(code,{"Content-Type":"application/json"});res.end(JSON.stringify(data))}
    const ok = (data,code=200) => send(code,{statusCode:200,message:"OK",error:null,data})
    if (url.pathname === "/__state") return ok({channels,writes})
    if (url.pathname === "/__control") {failNext = body.failNext === true; return ok({failNext})}
    const token = req.headers.authorization
    const superAdmin = token === "Bearer master-demo-superadmin"
    if (!superAdmin && token !== "Bearer master-demo-support") return send(401,{message:"Unauthorized"})
    if (req.method === "GET" && url.pathname === "/master/tenants") {
        return ok({items:[tenant],total:1,limit:10,offset:0})
    }
    if (req.method === "GET" && url.pathname === "/master/tenants/"+tenantID) return ok(tenant)
    const base = "/master/tenants/"+tenantID+"/commerce-channels"
    if (req.method === "GET" && url.pathname === base) return ok(channels)
    if (req.method === "PATCH" && url.pathname.startsWith(base+"/")) {
        if (!superAdmin) return send(403,{message:"Only SUPER_ADMIN can manage channels"})
        const channel = channels.find(item=>item.channelID===url.pathname.slice(base.length+1))
        if (!channel) return send(404,{message:"Channel not found"})
        const allowed = ["name","domain","storeID","active","salesEnabled","acceptTestPayments"]
        if (Object.keys(body).some(key=>!allowed.includes(key)) ||
            ["salesEnabled","acceptTestPayments"].some(key=>key in body && typeof body[key]!=="boolean")) {
            return send(400,{message:"Invalid channel payload"})
        }
        writes.push({method:"PATCH",channelID:channel.channelID,body})
        if (failNext) {failNext=false;return send(403,{message:"No se pudo guardar el canal de prueba"})}
        Object.assign(channel,body)
        return ok(channel)
    }
    if (req.method === "POST" && url.pathname === base) {
        if (!superAdmin) return send(403,{message:"Only SUPER_ADMIN can manage channels"})
        if (!body.name || !body.code || body.storeID!==storeID ||
            typeof body.salesEnabled!=="boolean" || typeof body.acceptTestPayments!=="boolean") {
            return send(400,{message:"Invalid channel payload"})
        }
        const channel = {...body,tenantID,channelID:"00000000-0000-4000-8000-000000000005",
            active:true,createdAt:stamp,updatedAt:stamp}
        channels.push(channel)
        writes.push({method:"POST",body})
        return ok({...channel,token:"demo-token-valid-only-in-this-mock"},201)
    }
    send(501,{message:"Path outside this fixture contract"})
}).listen(process.env.PORT)
