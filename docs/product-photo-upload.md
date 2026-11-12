# Subida de fotos: compatibilidad y diagnóstico

La subida del ERP envía un `File`/`Blob` en `FormData` a la Server Action de
Next.js. La galería ajusta primero cada imagen a JPG de 1080 × 1350; el editor
usa la misma acción. Se mantiene el límite de 5 MB por foto y el límite de
transporte de 8 MB en `next.config.ts`.

Los selectores pueden entregar un MIME vacío o `application/octet-stream`.
En esos casos se reconoce la extensión JPG/JPEG, PNG, WEBP, AVIF o GIF. También
se admiten los alias MIME `image/jpg` y `image/pjpeg`. El navegador debe poder
decodificar la imagen y Cloudinary valida su contenido. HEIC no se añade como
formato admitido: hay que exportarlo a JPG/PNG.

La acción sigue verificando la sesión y obtiene la empresa exclusivamente de
`GET /stores` con el bearer actual; nunca acepta un tenant enviado por el
navegador. Se consultó Scalar remoto el 2026-11-12: `Store.tenantID` sigue
publicado, y `UpdateProductDto.image` conserva hasta cinco URLs ordenadas.
No cambia el contrato del backend ni hay migración nueva.

## Errores de producción

Los errores esperados vuelven como una unión serializable de éxito/error.
La UI recibe solamente la URL HTTPS en caso de éxito, o un mensaje seguro con
referencia cuando hay un fallo del servicio. Next.js recomienda devolver los
errores esperados como valores en las Server Functions:
https://nextjs.org/docs/app/getting-started/error-handling

Para soporte, buscar `[product-photo-upload]` y la referencia en los logs del
**frontend** desplegado. El registro contiene la etapa (`session`, `stores` o
`cloudinary`) y el código HTTP de Cloudinary cuando existe. No incluye el
archivo, tokens, credenciales ni la respuesta completa del proveedor. Los
fallos de transporte anteriores a ejecutar la acción muestran un mensaje de
reintento; también conviene revisar el estado HTTP de esa petición en Network.
No se reintenta automáticamente una subida que pueda haberse completado.

El reporte original indica que usuario B + foto B funciona en Windows y falla
en Mac; usuario B + foto C también falla en Mac. La captura por sí sola no
identifica la causa del servidor. La prueba final pendiente es repetir el
archivo original en ese Mac tras desplegar el frontend y, si falla, usar la
referencia y la petición de Network para localizar el motivo concreto.

## Verificación local sin proveedores reales

La simulación existente cubre ERP y Cloudinary con credenciales ficticias:

```powershell
postman simulation run postman/simulations/product-photo-upload.sim.yaml --port 4902 --output ndjson --no-history
```

En otra terminal:

```powershell
node postman/checks/product-photo-upload.cjs
node scripts/check-product-photos.cjs
```

Para probar el transporte React de producción y el componente real, se necesita
Playwright disponible en el entorno de QA con Chromium/Edge y WebKit. Si no
está instalado en este repo, `PLAYWRIGHT_MODULE` puede apuntar a su módulo
existente y `PLAYWRIGHT_BROWSERS_PATH` a su caché de navegadores. No hace falta
agregar una dependencia de producción.

En una terminal de QA dedicada, preparar la página efímera y compilar contra la
simulación (nunca usar estas variables en un despliegue):

```powershell
node scripts/check-product-photo-browser.cjs --prepare
$env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:4902/upload'
$env:NEXT_PUBLIC_CLOUD_NAME = 'photo-demo'
$env:CLOUD_API_KEY = 'fake-key'
$env:CLOUD_API_SECRET = 'fake-secret'
$env:CLOUDINARY_URL = 'cloudinary://fake-key:fake-secret@photo-demo?upload_prefix=http%3A%2F%2F127.0.0.1%3A4902%2Fupload'
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación de QA' }
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3442
```

En otra terminal, con Playwright disponible:

```powershell
node scripts/check-product-photo-browser.cjs
```

Al terminar, detener el servidor de QA y la simulación, retirar la página
temporal y cerrar la terminal con variables ficticias. Desde una terminal
normal volver a compilar con el entorno habitual:

```powershell
node scripts/check-product-photo-browser.cjs --clean
npm run build
```

La página generada `src/app/photo-upload-qa/page.tsx` no se debe commitear ni
desplegar. El script se niega a reemplazar o borrar una página diferente.

El 2026-11-12 pasaron Chromium/Edge y WebKit en Windows contra el Next compilado:
JPEG sintético de 3,1 MB y 3024 × 4032 con orientación EXIF, envío original por
multipart, subida ajustada cuya resolución se observó en el receptor como
1080 × 1350, MIME vacío, cambio de portada, editor, errores legibles en
producción, reintento, conservación del primer archivo cuando falla el segundo,
rechazo de tamaño y de sesión. No hubo errores JavaScript sin manejar. La
simulación registró las peticiones ERP y los POST multipart del SDK. Esto no
equivale a probar Safari/Chrome nativos en macOS, el archivo original, el CDN
real ni el guardado posterior del producto.
