# product-photo-upload

Local fixture for the real upload server action, the ERP stores client and the
Cloudinary SDK. Source contract: published ERP GET /stores, checked 2026-10-26,
and the installed Cloudinary SDK. Local contract fixtures are used; no owner mock search was performed.

## Purpose

Verify tenant-folder selection without touching a real Cloudinary account.

## Execution

From the frontend root (PowerShell):

```powershell
postman simulation run postman/simulations/product-photo-upload.sim.yaml --port 4902 --output ndjson --no-history
# Separate terminal:
$env:PHOTO_SIMULATION_URL='http://127.0.0.1:4902/upload'
node postman/checks/product-photo-upload.cjs
```

Stop the simulation with Ctrl+C. Use only the local fixture's fake credentials.

## Assumptions

- The harness supplies the Next cookies request boundary; action, fetcher,
  normalization and Cloudinary SDK run unchanged over real HTTP. It does not
  exercise browser file selection, React transport or live CDN credentials.
- ERP tenant isolation remains enforced by its auth, tenant guards and RLS;
  this fixture only models their responses. (reasoned 2026-10-26)

## Observations

<!-- begin:observations -->
- 2026-11-12 (Mac upload follow-up): The upload action now accepts FormData
  and returns safe serializable results rather than throwing expected service
  errors. Re-read live Scalar GET /stores, Store.tenantID and the product image
  contract; no backend DTO changed. The HTTP harness passed tenant/support
  isolation, invalid/expired sessions, ambiguous companies, empty/oversized
  files, unsupported formats, missing MIME, CDN 400/503 and sanitized errors
  with references. The original ArrayBuffer action observations below describe
  the earlier implementation and remain as history.
- 2026-11-12 (browser transport): `scripts/check-product-photo-browser.cjs`
  passed using Chromium/Edge and WebKit on Windows against a production Next
  build and these local stand-ins. A 3.1 MB synthetic JPEG with EXIF orientation
  traversed FormData/React transport; the real gallery's canvas output reached
  the receiver as JPEG 1080 x 1350. Reordering, editor upload, a readable
  production failure, retry, a partially successful batch and rejected
  size/session were verified. Simulation request events showed GET /stores and
  Cloudinary SDK multipart POSTs, including injected 400/503 responses. No real
  CDN, native Mac browser, user image or product PATCH was exercised. See
  `docs/product-photo-upload.md` for setup/cleanup and remaining diagnosis.
- 2026-11-12: Re-ran `node postman/checks/product-photo-upload.cjs` against the
  local simulation using CLI 1.74.0. Tenant/support folder isolation, rejected
  sessions, empty/mixed/missing tenant data, file-size checks and the surfaced
  CDN failure all passed. Request events confirmed the real ERP fetcher and
  Cloudinary SDK reached the fixture. Upload actions and API payloads are
  unchanged; this does not establish live CDN or product PATCH behavior.
- 2026-11-12: Read the current remote Scalar `UpdateProductDto.image` and
  `PATCH /products/{id}` contract in memory: image URLs are ordered, comma
  separated, and the first is the cover. No OpenAPI snapshot was saved.
  `scripts/check-product-photos.cjs` passed ordering/cover, Excel round-trip,
  4:5 placement, crop positioning and zoom checks. An ephemeral headless Chrome
  check exercised the real browser canvas helpers: decoded JPEG dimensions
  were 1080 x 1350, whole-image fitting retained both sides with white padding,
  crop positioning selected either side, and zoom could crop an already padded
  image. The browser check did not upload images or exercise the React form.
- 2026-10-26: The real upload action, stores fetcher and Cloudinary SDK passed
  for tenant and support sessions with distinct company folders. Both ERP GET
  and CDN multipart POST paths served traffic in the upload member. Invalid
  sessions, missing/mixed company context and invalid size sent no CDN request;
  a CDN rejection surfaced the expected error. No live credentials were tested.
<!-- end:observations -->

## What didn't work

- The previous uploader expected tenantID in check-status.user, which the
  current backend omits. (reasoned 2026-10-26, src/auth/auth.service.ts)

- 2026-10-26: The SDK chooses HTTP/HTTPS when first imported. Changing its
  prefix afterwards caused ERR_INVALID_PROTOCOL; the check now sets the fake
  CLOUDINARY_URL before importing the action. Production configuration is unchanged.
