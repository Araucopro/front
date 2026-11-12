// Local-only fixture. ERP shape: published GET /stores and Store.tenantID.
// Cloudinary shape: installed SDK upload_stream, /v1_1/:cloud/image/upload.
const http = require('node:http')
const tenant = '00000000-0000-4000-8000-000000000001'
const supportTenant = '00000000-0000-4000-8000-000000000099'
let mode = 'ok'
let modeUploads = 0
const uploads = []
const jpegSize = buffer => {
  let offset = buffer.indexOf(Buffer.from([255, 216, 255]))
  if (offset < 0) return null
  offset += 2
  while (offset + 9 < buffer.length && buffer[offset] === 255) {
    const marker = buffer[offset + 1]
    if ([192, 193, 194].includes(marker)) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) }
    if (marker === 218 || marker === 217) break
    const length = buffer.readUInt16BE(offset + 2)
    if (length < 2) break
    offset += length + 2
  }
  return null
}
http.createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)
  const send = (status, data) => {
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(data))
  }
  if (req.url === '/__control') { mode = JSON.parse(buffer).mode; modeUploads = 0; return send(200, { mode }) }
  if (req.url === '/__state') return send(200, { uploads })
  if (req.url === '/stores' && req.method === 'GET') {
    const token = req.headers.authorization
    if (token === 'Bearer master-without-company') return send(403, { message: 'Tenant context is required' })
    if (!['Bearer tenant-demo', 'Bearer support-demo'].includes(token)) return send(401, { message: 'Invalid or expired token' })
    const tenantID = token === 'Bearer support-demo' ? supportTenant : tenant
    let data = [{ storeID: '10000000-0000-4000-8000-000000000001', tenantID, name: 'Tienda simulada' }]
    if (mode === 'empty') data = []
    if (mode === 'mixed') data.push({ storeID: '10000000-0000-4000-8000-000000000002', tenantID: supportTenant })
    if (mode === 'missing-tenant') delete data[0].tenantID
    return send(200, { statusCode: 200, message: 'OK', error: null, data })
  }
  if (req.url === '/v1_1/photo-demo/image/upload' && req.method === 'POST') {
    const field = name => {
      const match = buffer.toString('utf8').match(new RegExp('name="' + name + '"\r\n\r\n([^\r]+)'))
      return match?.[1]
    }
    uploads.push({ folder: field('folder'), overwrite: field('overwrite'),
      unique_filename: field('unique_filename'), allowed_formats: field('allowed_formats'),
      hasPng: buffer.includes(Buffer.from([137,80,78,71,13,10,26,10])),
      hasJpeg: buffer.includes(Buffer.from([255,216,255])),
      jpegSize: jpegSize(buffer), mode })
    modeUploads += 1
    if (mode === 'cdn-failure') return send(400, { error: { message: 'Invalid image file' } })
    if (mode === 'cdn-unavailable') return send(503, { error: { message: 'Service unavailable' } })
    if (mode === 'cdn-second-failure' && modeUploads === 2) {
      return send(400, { error: { message: 'Invalid image file' } })
    }
    return send(200, { public_id: field('folder') + '/simulated', resource_type: 'image',
      secure_url: `https://res.cloudinary.com/photo-demo/image/upload/simulated-${uploads.length}.png` })
  }
  return send(501, { message: 'Path outside this fixture contract' })
}).listen(process.env.PORT)
