# Descuentos por canal y sucursal

Rama en frontend y backend: `feats-descuentos-alcance`.

La configuración vive en **Tienda → Inventario → Ofertas y descuentos** y en el
formulario de venta. Puede gestionarla el administrador del tenant o un master
con impersonación activa. No agrega controles al panel master.

## Comportamiento

- Las cards de **Alcance** permiten elegir tienda física, tienda online o ambas.
  Online está disponible cuando la empresa tiene un canal ecommerce activo.
- Las sucursales se seleccionan por separado. El ecommerce aplica solo a sus
  tiendas vinculadas; una tienda sin vinculación sigue participando en caja si
  también se eligió tienda física.
- **Aplicar a** determina los productos: categoría, marca o productos concretos.
  Para productos concretos se incluyen todas sus variantes en las sucursales
  elegidas. Los descuentos de una variante y los combos conservan una sola tienda.
- El 2×1 agrupa las unidades participantes en el backend y descuenta las más
  baratas. Dos productos diferentes de $1.000 y $2.000 cuestan $2.000. Una unidad
  que no participa conserva su precio. Una sola unidad participante no activa 2×1.
- Al elegir 2×1/combo se marca **Permitir bajo margen**, necesario para unidades
  gratuitas con costo. El administrador puede revisar y cambiar esa autorización.
- La caja cotiza el carrito completo al cambiar cantidades, refleja los totales
  del backend y espera un cálculo válido antes de vender. Las respuestas antiguas
  no reemplazan el resultado de un carrito más reciente.

## Contrato aditivo del backend

Se consultó Scalar remoto el 12 de noviembre de 2026. `calculate-cart` y las rutas
de creación/edición ya estaban publicados; los siguientes campos y la consulta de
opciones se definen en esta rama y requieren desplegar el backend.

`POST /pricing/offers` y `POST /pricing/offers/:id` admiten:

```ts
salesChannels?: Array<"PHYSICAL" | "ONLINE">
storeIDs?: string[]
```

Los arrays enviados deben tener al menos un elemento, sin duplicados. `storeID`
es la tienda de referencia y debe estar incluido en `storeIDs`. Se comprueba en
el servidor que tiendas, productos y categoría pertenezcan al tenant. Para
ONLINE se requiere al menos un ecommerce activo vinculado a la selección.

`GET /pricing/offer-options` devuelve las tiendas del tenant con `storeID`, `name`
y `onlineEnabled`, además de los `salesChannels` disponibles. No devuelve tokens
ni datos de configuración privada de canales. Usa los mismos permisos de gestión.

El canal de cálculo se obtiene de la sesión autenticada: las peticiones de canal
ecommerce usan ONLINE; la caja y las sesiones administrativas usan PHYSICAL.
El navegador no puede convertir una venta de caja en online enviando un campo.

Las ofertas anteriores conservan ambos canales y su tienda original. Los nuevos
formularios comienzan con tienda física. El frontend usa `src/actions` y `fetcher`.
No se guardó una copia local de OpenAPI.

## Migraciones pendientes de verificar por entorno

La migración nueva debe aplicarse **antes de iniciar el backend actualizado**:

| Migración / archivo en backend | Efecto |
| --- | --- |
| `AddOfferSalesChannels1794500000000` — `src/datasource/migrations/1794500000000-AddOfferSalesChannels.ts` | Agrega `SpecialOffer.salesChannels`, `SpecialOffer.storeIDs`, restricción de canales e índice GIN de sucursales. Conserva el alcance anterior de las ofertas existentes. |

El flujo ecommerce depende también de estas migraciones existentes. No se ha
confirmado su aplicación en ninguna base durante esta tarea:

| Migración / archivo en backend | Efecto |
| --- | --- |
| `CreateCommerceChannels1790900000000` — `src/datasource/migrations/1790900000000-CreateCommerceChannels.ts` | Crea la vinculación del canal con tenant y tienda. |
| `CreateCommerceOrders1791000000000` — `src/datasource/migrations/1791000000000-CreateCommerceOrders.ts` | Agrega permisos de venta del canal y persistencia de pedidos ecommerce. |
| `AddChannelPhotoRequirement1792965600000` — `src/datasource/migrations/1792965600000-AddChannelPhotoRequirement.ts` | Agrega la política de foto del canal que consume la versión actual del ecommerce. |

| Entorno | Estado durante esta tarea |
| --- | --- |
| Desarrollo | No se consultó `migration:show` contra una base; no se ejecutaron migraciones. |
| Producción | No se consultó `migration:show` contra una base; no se ejecutaron migraciones ni despliegues. |

### Aplicación desde PowerShell

Repetir el procedimiento por separado para desarrollo y producción. Utilizar la
URL PostgreSQL **del propietario de la base elegida**, accesible desde la PC.
La URL HTTP de Railway/Scalar no sirve como conexión PostgreSQL. No pegar
credenciales en el chat.

```powershell
Set-Location 'C:\Users\L2r2g\Documents\CODIGO\ARAUCO\desi-backend-nest'
git branch --show-current
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Falló el build. Detener y revisar.' }

$migrationEnvironment = Read-Host 'Entorno destino: desarrollo o producción'
$migrationSecret = Read-Host "URL PostgreSQL del propietario de $migrationEnvironment" -AsSecureString
$migrationPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($migrationSecret)
try {
    $env:MIGRATION_DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($migrationPointer)
    npm run migration:show
    if ($LASTEXITCODE -ne 0) { throw 'Falló migration:show. Detener y revisar.' }

    # migration:run aplica TODAS las pendientes, no solo la de esta feature.
    $migrationConfirmation = Read-Host 'Revisa entorno y pendientes. Escribe MIGRAR para continuar'
    if ($migrationConfirmation -eq 'MIGRAR') {
        npm run migration:run
        if ($LASTEXITCODE -ne 0) { throw 'Falló migration:run. Detener y revisar antes de continuar.' }
        npm run migration:show
        if ($LASTEXITCODE -ne 0) { throw 'Falló la verificación final de migraciones.' }
        # Confirmar [X] en las migraciones indicadas arriba.
    }
} finally {
    Remove-Item Env:\MIGRATION_DATABASE_URL -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($migrationPointer)
    $migrationSecret.Dispose()
}
```

Después de ver `[X]`, iniciar/desplegar el backend en **ese mismo entorno** y
comprobar: crear una promoción física, una online y otra de ambas; recuperarlas
al editar; cotizar dos productos participantes con precios diferentes; confirmar
que el total de caja/ecommerce coincide con el alcance guardado. Repetir la
verificación con administrador tenant y master impersonado. Las pruebas unitarias
no sustituyen esta comprobación contra la base migrada.

En Railway, `railway.json` ya declara `npm run migration:run` como pre-deploy.
Verificar la conexión del propietario y los logs de ese paso; que exista el
archivo de configuración no prueba que la migración esté aplicada.

Subir y desplegar primero el backend con sus migraciones; después el frontend.
No se ha hecho commit, push ni despliegue desde esta tarea.

## Verificación local

Backend: `src/pricing/discount-coverage.spec.ts` ejecuta los servicios reales de
ofertas y precios con repositorios de prueba, incluidos 2×1, canal, sucursal,
aislamiento tenant, DTO y permisos. Las suites de ventas y ecommerce verifican
las regresiones del motor compartido.

Frontend: compilar con `npm run build`. Para comprobar transporte contra el
stand-in local, iniciar en otra terminal:

```powershell
postman simulation run postman/simulations/discount-coverage.sim.yaml --port 4903 --output ndjson --no-history
```

En esta terminal:

```powershell
node postman/checks/discount-coverage.cjs
```

La simulación comprueba acciones y errores HTTP contra una fixture local. Los
importes de esa fixture representan escenarios cubiertos por los tests del
backend; no son evidencia de precios ni migraciones del servicio desplegado.

La verificación de Chrome con un arnés temporal también comprobó las cards,
guardado rechazado sin perder selecciones, edición a marca/solo online, vista
móvil sin desbordamiento, master con y sin impersonación, recálculo del carrito,
supresión de respuestas antiguas y reintento de una cotización fallida. El arnés
temporal se retiró; no se agregó una ruta de prueba al producto.
