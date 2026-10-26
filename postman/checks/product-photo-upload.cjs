// Run the real server action and Cloudinary SDK against local HTTP fixtures.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const src = path.resolve(__dirname, '../../src')
const base = process.env.PHOTO_SIMULATION_URL || 'http://127.0.0.1:4902/upload'
assert.equal(new URL(base).hostname, '127.0.0.1', 'Only a local simulation is allowed')
process.env.NEXT_PUBLIC_API_URL = base
process.env.NEXT_PUBLIC_CLOUD_NAME = 'photo-demo'
process.env.CLOUD_API_KEY = 'fake-key'
process.env.CLOUD_API_SECRET = 'fake-secret'
// The SDK chooses HTTP/HTTPS at import time, so set its local prefix first.
process.env.CLOUDINARY_URL = 'cloudinary://fake-key:fake-secret@photo-demo?upload_prefix=' + encodeURIComponent(base)
let token = 'tenant-demo'
const resolve = Module._resolveFilename
const load = Module._load
Module._resolveFilename = function(request, parent, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(src, request.slice(2)) : request, parent, ...args)
}
Module._load = function(request, parent, ...args) {
  if (request === 'next/headers') return { cookies: async () => ({ get: name =>
    name === 'auth_token' && token ? { value: token } : undefined }) }
  return load.call(this, request, parent, ...args)
}
Module._extensions['.ts'] = function(module, file) {
  module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText, file)
}
const { uploadImageCDN } = require(path.join(src, 'actions/upload/image.ts'))
const { cloudinary } = require(path.join(src, 'lib/cdn-setup.ts'))
// Test-process SDK routing only; production CDN configuration is untouched.
cloudinary.config({ upload_prefix: base, disable_promise: true })
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZgAAAABJRU5ErkJggg==', 'base64')).buffer
const state = async () => (await fetch(base + '/__state')).json()
const mode = async value => fetch(base + '/__control', { method: 'POST', headers: {
  'content-type': 'application/json' }, body: JSON.stringify({ mode: value }) })
;(async () => {
  const initial = (await state()).uploads.length
  token = ''
  await assert.rejects(uploadImageCDN(png), /Inicia sesion/)
  token = 'invalid'
  await assert.rejects(uploadImageCDN(png), /Invalid or expired token/)
  token = 'master-without-company'
  await assert.rejects(uploadImageCDN(png), /Tenant context is required/)
  token = 'tenant-demo'
  await assert.rejects(uploadImageCDN(new ArrayBuffer(0)), /5 MB/)
  await assert.rejects(uploadImageCDN(new ArrayBuffer(5 * 1024 * 1024 + 1)), /5 MB/)
  for (const value of ['empty', 'mixed', 'missing-tenant']) {
    await mode(value)
    await assert.rejects(uploadImageCDN(png), /No se pudo verificar la empresa/)
  }
  assert.equal((await state()).uploads.length, initial, 'Rejected requests must not upload files')
  await mode('ok')
  const tenantUpload = await uploadImageCDN(png, 'foto.png')
  assert.match(tenantUpload.secure_url, /^https:\/\/res.cloudinary.com\//)
  token = 'support-demo'
  await uploadImageCDN(png, 'soporte.png')
  let uploads = (await state()).uploads.slice(initial)
  assert.equal(uploads[0].folder, 'desi_v2/00000000-0000-4000-8000-000000000001/products')
  assert.equal(uploads[1].folder, 'desi_v2/00000000-0000-4000-8000-000000000099/products')
  assert.ok(uploads.every(item => item.hasPng && item.overwrite === '0' && item.unique_filename === '1'))
  await mode('cdn-failure')
  await assert.rejects(uploadImageCDN(png), /No se pudo subir la foto a Cloudinary/)
  await mode('ok')
  console.log(JSON.stringify({ tenantUpload: true, supportUpload: true, authRequired: true,
    ambiguousTenantRejected: true, fileSizeEnforced: true, cloudinaryFailureHandled: true }))
})().catch(error => { console.error(error); process.exitCode = 1 })
