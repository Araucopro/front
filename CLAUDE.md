# Guia de trabajo para Claude en el frontend ARAUCO

Claude debe seguir estas reglas antes de implementar cambios en este repositorio. El objetivo es mantener contexto arquitectonico permanente y evitar que nuevas features choquen con el frontend existente o pongan logica de backend en la UI.

## Resumen ejecutivo

Este frontend es un Next.js App Router para un ERP retail. La UI maneja experiencia, formularios, filtros, carritos y visualizaciones. El backend debe ser la fuente de verdad para permisos, stock, precios, descuentos, pagos, anulaciones, impuestos, folios y persistencia.

Archivos clave:

- `src/app`: rutas y carga inicial server-side.
- `src/actions`: unica capa normal para consumir backend.
- `src/lib/fetcher.ts`: cliente HTTP comun con bearer token y unwrap de `{ statusCode, data }`.
- `src/lib/normalize-*.ts`: adaptadores backend -> interfaces del frontend.
- `src/stores`: Zustand para estado local/transitorio.
- `src/interfaces`: contratos TypeScript consumidos por UI.
- `backend-json` y `swagger.json`: referencia de contratos backend.

## Stack

- Next.js, React 19, TypeScript estricto.
- Tailwind CSS, Radix/shadcn-like components, `sonner` para feedback.
- Zustand para estado cliente.
- Alias `@/` apunta a `src`.

## Regla principal

No mover reglas de negocio definitivas al frontend.

Frontend puede:

- Validar rapido para UX.
- Calcular totales visibles y previews.
- Filtrar, ordenar, paginar y agrupar datos.
- Preparar payloads.
- Normalizar respuestas.

Backend debe:

- Autorizar por usuario, rol y tienda.
- Validar stock real, precios reales y descuentos vigentes.
- Calcular totales finales, impuestos, folios y estados.
- Persistir ventas, compras, transferencias, movimientos y anulaciones.
- Rechazar payloads invalidos aunque el frontend ya haya validado.

## Como consumir backend

- No usar `fetch` directo en componentes.
- Crear acciones en `src/actions/<dominio>/<operacion>.ts`.
- Usar siempre `fetcher<T>()`.
- Usar `API_URL` desde `src/lib/enviroments.ts`.
- Usar `URLSearchParams` para queries.
- Tipar request/response en `src/interfaces`.
- Si el backend responde con forma distinta a la que usa UI, crear/extender normalizador en `src/lib/normalize-*.ts`.

Ejemplo:

```ts
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export async function createX(payload: ICreateX): Promise<IXResponse> {
    return fetcher<IXResponse>(`${API_URL}/x`, {
        method: "POST",
        body: JSON.stringify(payload),
    })
}
```

## Flujo recomendado para paginas

1. `src/app/**/page.tsx` obtiene datos iniciales en servidor con acciones.
2. La pagina pasa datos como `initialProducts`, `initialStores`, etc.
3. Un componente `"use client"` maneja interaccion.
4. Hooks/stores derivan filtros, paginacion y UI.
5. Mutaciones llaman acciones y luego actualizan estado local o hacen `router.refresh()`.

## Zustand

Usar Zustand solo para estado que pertenece al cliente:

- `useAuth`: sesion persistida y usuario actual.
- `useTienda`: tiendas y tienda seleccionada.
- `useSaleStore`: carrito y metodo de pago.
- `inventoryStore`: filtros, paginacion, edicion inline.
- `useEditOrderStore`: edicion local de orden/cotizacion.
- `useProductFormStore`: formulario de productos.

No usar Zustand como cache global para reemplazar la carga server-side ni como fuente de verdad de entidades remotas.

## Normalizadores

Los normalizadores protegen a la UI de diferencias del backend:

- `normalizeProduct` adapta productos, variaciones y stock por tienda.
- `normalizeSale` adapta ventas.
- `normalizeStore`/`normalizeUser` adaptan usuario, tienda y relaciones.

Si aparece inconsistencia como `store`/`Store`, `variations`/`ProductVariations`, `storeProducts`/`StoreProducts`, resolverla en normalizador, no dentro de cada componente.

## Contratos backend

Antes de inventar payloads revisar:

- `backend-json/routes/<dominio>.json`
- `backend-json/dtos/<dominio>.json`
- `swagger.json`
- Interfaces cercanas en `src/interfaces`

Mantener nombres actuales del dominio:

- IDs con sufijo `ID`: `storeID`, `saleID`, `productID`, `variationID`, `storeProductID`.
- Ventas: `paymentType`, `items`, `unitPrice`, `quantity`, `status`.
- Productos: `productID`, `categoryID`, `ProductVariations`, `StoreProducts`.

Si falta endpoint, documentar propuesta asi:

```ts
// METHOD /resource/:id/action
type Request = {
    storeID: string
    items: Array<{ variationID: string; quantity: number }>
}

type Response = {
    resourceID: string
    status: string
    createdAt: string
}
```

## Roles y seguridad

Roles actuales en `src/lib/userRoles.ts`:

- `admin`
- `store_manager`
- `consignado`
- `tercero`

La UI filtra navegacion por rol en `Sidebar`, pero eso no es seguridad real. El backend debe validar permisos. Al crear rutas o acciones nuevas, conservar `storeID` cuando el flujo dependa de tienda seleccionada.

## Zonas sensibles

Ventas:

- `createNewSale` envia `{ storeID, paymentType, items: [{ variationID, quantity, unitPrice }] }`.
- UI calcula total para mostrar, pero backend debe recalcular.
- UI valida tienda y carrito, pero backend debe revalidar stock/precio.

Inventario:

- La vista carga datos iniciales desde server.
- Filtros/paginacion son locales.
- Edicion inline llama acciones existentes y puede registrar movimiento de inventario.
- Stock final debe validarse/persistirse en backend.

Descuentos/precios:

- UI puede mostrar `finalPrice` y `activeOffer`.
- Backend debe decidir descuento vigente y precio final.

Reportes/dashboard:

- UI puede agrupar/graficar datos ya recibidos.
- Si un calculo sera usado para decisiones contables o persistidas, moverlo a backend o crear endpoint de reporte.

## Checklist antes de terminar una implementacion

- Revise estructura y archivos cercanos.
- Use accion en `src/actions` y `fetcher`.
- Tipos en `src/interfaces`.
- Normalizacion en `src/lib` si hizo falta.
- Estado remoto no quedo como fuente de verdad en Zustand.
- Reglas sensibles siguen validadas por backend.
- `storeID`, roles y navegacion se mantienen.
- UI sigue patrones actuales.
- Corri `npm run build` o explique por que no.

