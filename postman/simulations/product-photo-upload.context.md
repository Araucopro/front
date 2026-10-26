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
