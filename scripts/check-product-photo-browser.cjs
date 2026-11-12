// Requires a production Next server built with the local fixture and fake CDN
// credentials. See docs/product-photo-upload.md. Nothing calls a real provider.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const root = path.resolve(__dirname, '..')
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/product-photo-upload-page.tsx'), 'utf8')
const route = path.join(root, 'src/app/photo-upload-qa/page.tsx')
if (process.argv.includes('--prepare')) {
  assert.ok(!fs.existsSync(route), 'Refusing to replace an existing route')
  fs.mkdirSync(path.dirname(route), { recursive: true })
  fs.writeFileSync(route, fixture)
  console.log('Local fixture prepared. Remove with --clean before committing/deploying.')
  process.exit(0)
}
if (process.argv.includes('--clean')) {
  if (fs.existsSync(route)) {
    assert.equal(fs.readFileSync(route, 'utf8'), fixture, 'Refusing to remove a different route')
    fs.unlinkSync(route)
    fs.rmdirSync(path.dirname(route))
  }
  console.log('Local fixture removed. Rebuild before deploying.')
  process.exit(0)
}
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const sharp = require('sharp')
const url = process.env.PHOTO_QA_URL || 'http://127.0.0.1:3442/photo-upload-qa'
const base = process.env.PHOTO_SIMULATION_URL || 'http://127.0.0.1:4902/upload'
for (const value of [url, base]) assert.equal(new URL(value).hostname, '127.0.0.1', 'Only local fixtures are allowed')
const state = async () => (await fetch(base + '/__state')).json()
const mode = async value => {
  const response = await fetch(base + '/__control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: value }) })
  assert.ok(response.ok)
}
const waitFor = async (page, expected) => page.waitForFunction(value =>
  document.querySelector('[data-testid="photo-value"]').textContent.split(',').filter(Boolean).length === value &&
  document.querySelector('[data-testid="photo-busy"]').textContent === 'false', expected)
;(async () => {
  // Phone-sized JPEG, >2 MB, portrait and EXIF orientation, never a user image.
  const original = await sharp(randomBytes(3024 * 4032 * 3), { raw: { width: 3024, height: 4032, channels: 3 } })
    .jpeg({ quality: 30 }).withMetadata({ orientation: 6 }).toBuffer()
  assert.ok(original.length > 2 * 1024 * 1024 && original.length < 5 * 1024 * 1024)
  const errors = []
  for (const [name, engine, options] of [
    ['chromium', chromium, { channel: process.platform === 'win32' ? 'msedge' : undefined }],
    ['webkit', webkit, {}],
  ]) {
    const browser = await engine.launch({ headless: true, ...options })
    try {
      const context = await browser.newContext()
      await context.addCookies([{ name: 'auth_token', value: 'tenant-demo', url }])
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(`${name}: ${error.message}`))
      // No browser traffic to real image hosts, including Next's optimizer.
      const preview = await sharp({ create: { width: 1080, height: 1350, channels: 3, background: '#ffffff' } }).jpeg().toBuffer()
      await page.route('**/_next/image?*', route => route.fulfill({ status: 200, contentType: 'image/jpeg', body: preview }))
      await page.route('https://res.cloudinary.com/**', route => route.fulfill({ status: 200, contentType: 'image/jpeg', headers: { 'access-control-allow-origin': '*' }, body: preview }))
      await mode('ok')
      await page.goto(url)
      let before = (await state()).uploads.length
      await page.getByLabel('Original sin ajustar').setInputFiles({ name: 'IMG_7145.JPG', mimeType: 'image/jpeg', buffer: original })
      await page.waitForFunction(() => document.querySelector('[data-testid="raw-result"]').textContent.startsWith('https://'))
      assert.equal((await state()).uploads.length, before + 1, name + ': raw multipart >2MB')
      // Same original through the actual formatting and gallery UI.
      await page.getByLabel('Seleccionar archivos de fotos').setInputFiles({ name: 'IMG_7145.JPG', mimeType: 'image/jpeg', buffer: original })
      await waitFor(page, 1)
      assert.deepEqual((await state()).uploads.at(-1).jpegSize, { width: 1080, height: 1350 })
      const successfulURL = await page.getByTestId('photo-value').textContent()
      assert.ok(successfulURL.startsWith('https://res.cloudinary.com/'))
      // Test the picker variant that omits MIME metadata.
      await page.getByLabel('Seleccionar archivos de fotos').setInputFiles({ name: 'otra-foto.JPG', mimeType: '', buffer: original })
      await waitFor(page, 2)
      const pair = (await page.getByTestId('photo-value').textContent()).split(', ')
      await page.getByRole('button', { name: 'Usar foto 2 como portada', exact: true }).click()
      assert.equal(await page.getByTestId('photo-value').textContent(), [pair[1], pair[0]].join(', '))
      // Re-editing the formatted photo follows the same upload path.
      await page.getByRole('button', { name: 'Ajustar foto 1 a formato 4:5', exact: true }).click()
      await page.getByRole('button', { name: 'Aplicar ajuste', exact: true }).click()
      await waitFor(page, 2)
      assert.ok(!(await page.getByTestId('photo-value').textContent()).startsWith(pair[1]))
      await mode('cdn-failure')
      const preserved = await page.getByTestId('photo-value').textContent()
      await page.getByLabel('Seleccionar archivos de fotos').setInputFiles({ name: 'fallo.jpg', mimeType: 'image/jpeg', buffer: original })
      await page.getByText(/El servicio de fotos no pudo procesar la imagen/).waitFor()
      await waitFor(page, 2)
      assert.equal(await page.getByTestId('photo-value').textContent(), preserved)
      assert.doesNotMatch(await page.locator('body').innerText(), /Server Components|fake-secret/)
      await mode('ok')
      // Retrying the same file succeeds after a provider failure.
      await page.getByLabel('Seleccionar archivos de fotos').setInputFiles({ name: 'fallo.jpg', mimeType: 'image/jpeg', buffer: original })
      await waitFor(page, 3)
      await page.reload()
      await mode('cdn-second-failure')
      await page.getByLabel('Seleccionar archivos de fotos').setInputFiles([
        { name: 'primera.jpg', mimeType: 'image/jpeg', buffer: original },
        { name: 'segunda.jpg', mimeType: 'image/jpeg', buffer: original },
      ])
      await page.getByText(/El servicio de fotos no pudo procesar la imagen/).waitFor()
      await waitFor(page, 1)
      before = (await state()).uploads.length
      await mode('ok')
      await page.getByLabel('Seleccionar archivos de fotos').setInputFiles({ name: 'demasiado.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) })
      await page.getByText('Usa fotos JPG, PNG, WEBP, AVIF o GIF de hasta 5 MB', { exact: true }).waitFor()
      assert.equal((await state()).uploads.length, before)
      await context.clearCookies()
      await page.getByLabel('Seleccionar archivos de fotos').setInputFiles({ name: 'sin-sesion.jpg', mimeType: 'image/jpeg', buffer: original })
      await page.getByText('Inicia sesión para subir fotos', { exact: true }).waitFor()
      await waitFor(page, 1)
      assert.equal((await state()).uploads.length, before)
      console.log(JSON.stringify({ engine: name, originalBytes: original.length, rawMultipart: true, format4x5: true,
        missingMime: true, reorderAndEditor: true, readableProductionError: true, retry: true, partialBatchPreserved: true,
        invalidSizeAndSessionBlocked: true }))
      await context.close()
    } finally { await browser.close() }
  }
  assert.deepEqual(errors, [])
  await mode('ok')
})().catch(error => { console.error(error); process.exitCode = 1 })
