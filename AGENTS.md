# Guia de trabajo para agentes en el frontend ARAUCO

Este proyecto es un frontend Next.js App Router para un ERP retail: caja/ventas, inventario, ordenes de compra, facturacion, usuarios, reportes, transferencias y descuentos. Cualquier implementacion nueva debe respetar la arquitectura actual y mantener al backend como fuente de verdad.

## Stack y convenciones base

- Framework: Next.js con App Router en `src/app`.
- UI: React 19, TypeScript estricto, Tailwind CSS, componentes estilo shadcn/Radix en `src/components/ui`, iconos `lucide-react` o `react-icons` segun el patron cercano.
- Estado cliente: Zustand en `src/stores`.
- Peticiones: funciones de dominio en `src/actions/**` que llaman al backend con `src/lib/fetcher.ts`.
- Alias: usar `@/` para importar desde `src`.
- Estilos globales: `src/styles/globals.css`, `theme.css`, `tailwind-theme.css`, `fonts.css`.
- Contratos disponibles: `swagger.json` y `backend-json/routes/**`, `backend-json/dtos/**`.

## Estructura actual

- `src/app`: rutas, layouts, paginas server-side y paginas cliente cuando aplique. Las paginas bajo `/home` viven protegidas por cookie en `src/app/home/layout.tsx`.
- `src/actions`: capa de acceso al backend, separada por dominio (`products`, `sales`, `stores`, `purchase-orders`, etc.).
- `src/components`: componentes de UI por modulo funcional. Los wrappers cliente reciben datos iniciales desde las paginas server.
- `src/hooks`: logica reusable de UI/derivacion local, filtros, paginacion, analitica visual.
- `src/stores`: estado local/transitorio con Zustand.
- `src/interfaces`: tipos TypeScript que representan contratos consumidos por el frontend.
- `src/lib`: utilidades de infraestructura: `fetcher`, normalizadores, roles, environment, auth/session.
- `src/utils`: mappers y funciones puras de transformacion, fechas, precios, busqueda, exportacion.
- `backend-json`: referencia local de rutas y DTOs del backend. Consultar antes de inventar payloads.

## Flujo de datos recomendado

1. Una pagina server en `src/app/**/page.tsx` carga datos iniciales con acciones de `src/actions`.
2. La accion arma URL con `API_URL`, llama a `fetcher<T>()`, y transforma con normalizadores si la respuesta del backend no coincide con la forma que consume la UI.
3. La pagina entrega `initial...` props a un componente cliente o wrapper.
4. El wrapper cliente maneja interaccion local con hooks/stores: filtros, paginacion, formularios, carritos, loading, modales.
5. Las mutaciones se hacen llamando acciones de `src/actions`, mostrando feedback con `sonner`/`toast`, actualizando estado local solo como reflejo optimista o refrescando datos con `router.refresh()`.

## Peticiones y contratos

- No llamar `fetch` directo desde componentes salvo una razon muy justificada. Crear o reutilizar una accion en `src/actions/<dominio>`.
- Todas las acciones deben usar `fetcher<T>()` para conservar token bearer, `cache: "no-store"` y manejo uniforme de errores.
- `fetcher` agrega `Authorization: Bearer <auth_token>` desde cookie servidor o cliente.
- `fetcher` soporta respuestas directas y respuestas envueltas como `{ statusCode, data }`; devuelve `data` si existe.
- Usar `URLSearchParams` para query params.
- Para payloads nuevos, revisar primero `backend-json/dtos` y `backend-json/routes`; si no existe contrato, proponerlo claramente.
- Mantener nombres compatibles con backend actual: por ejemplo `storeID`, `productID`, `variationID`, `storeProductID`, `paymentType`, `items`, `unitPrice`.
- Si el backend devuelve nombres inconsistentes (`store` vs `Store`, `variations` vs `ProductVariations`, `StoreProducts` vs `storeProducts`), crear o extender normalizadores en `src/lib/normalize-*.ts`. No llenar componentes con defensas repetidas.

## Que logica vive en frontend

Permitido en frontend:

- Estado de UI: modales, tabs, filtros, ordenamiento, paginacion, loading, seleccion de tienda, modo oscuro.
- Formularios y validaciones de UX: campos requeridos, cantidades no negativas, mensajes tempranos.
- Calculos visuales derivados: totales mostrados, rankings, graficos, agrupaciones, porcentajes, filtros de tablas.
- Mappers de visualizacion y normalizacion de respuestas.
- Construccion de payloads para contratos existentes.

No debe vivir solo en frontend:

- Autorizacion real por rol o tienda.
- Validacion definitiva de stock, precios, descuentos, anulaciones, transferencias, pagos o impuestos.
- Reglas contables/fiscales o calculos que afecten persistencia.
- Creacion de IDs confiables, folios, correlativos, totales finales o estados finales.
- Integridad entre entidades: venta-stock, orden-stock, devoluciones, descuentos activos, permisos.

Regla practica: el frontend puede anticipar y ayudar, pero el backend debe decidir y persistir la verdad.

## Estado con Zustand

Zustand se usa para estado cliente, no como cache global permanente del backend.

- `useAuth` (`src/stores/user.store.ts`): usuario/token persistido en local storage y logout local.
- `useTienda` (`src/stores/tienda.store.ts`): tiendas disponibles y tienda seleccionada, persistidas.
- `useSaleStore` (`src/stores/sale.store.ts`): carrito de venta, metodo de pago y acciones del carrito.
- `inventoryStore` (`src/stores/inventory.store.ts`): busqueda, filtros de columnas, edicion inline, paginacion y productos cargados para la vista.
- `useEditOrderStore` (`src/stores/order.store.ts`): edicion local de ordenes/cotizaciones.
- `useProductFormStore` (`src/stores/product-form.store.ts`): creacion masiva/manual de productos y validacion local.
- Stores de filtros/categorias/pedidos/loading siguen la misma idea: UX local.

Al agregar un store:

- Usarlo solo si el estado debe compartirse entre componentes hermanos/lejanos o sobrevivir dentro del flujo.
- No duplicar datos remotos si pueden venir como props server.
- Persistir solo cuando aporte al usuario (`auth`, tienda seleccionada, preferencias); evitar persistir formularios sensibles o resultados de API.

## Server components y client components

- Por defecto, las paginas pueden ser server components y cargar datos en servidor.
- Usar `"use client"` cuando el componente necesita hooks, Zustand, eventos, `router`, `searchParams` cliente, estado local o efectos.
- Mantener la frontera limpia: datos iniciales en server, interaccion en client.
- En paginas protegidas bajo `/home`, el layout valida cookie `auth_token` y redirige a `/login`.
- Los filtros de navegacion por rol en `Sidebar` son solo UX. El backend debe proteger endpoints.

## Normalizadores

Los normalizadores en `src/lib/normalize-*.ts` son parte clave de la arquitectura.

- Usarlos para adaptar backend -> frontend.
- Mantener interfaces UI estables aunque el backend varie nombres o anidamientos.
- Centralizar conversiones de string/number, arrays opcionales, casing y defaults.
- No meter normalizacion compleja dentro de tablas o formularios.

Ejemplos existentes:

- `normalizeProduct`: adapta `variations/storeProducts/store` a `ProductVariations/StoreProducts/Store`.
- `normalizeSale`: adapta ventas backend/WooCommerce a `ISaleResponse`.
- `normalizeStore`, `normalizeUser`: toleran `store`/`Store` y relaciones usuario-tienda.

## Reglas para nuevas features

Antes de implementar:

1. Ubicar dominio existente en `src/actions`, `src/interfaces`, `src/components`.
2. Revisar `backend-json/routes` y `backend-json/dtos` del dominio.
3. Decidir que es dato remoto, que es estado de UI y que es calculo derivado.
4. Reutilizar acciones, stores, normalizadores y componentes UI cercanos.

Durante la implementacion:

- Crear interfaces en `src/interfaces/<dominio>` o extender las existentes.
- Crear accion en `src/actions/<dominio>/<operacion>.ts`.
- Usar `fetcher<T>()`.
- Si la respuesta necesita adaptacion, crear normalizador en `src/lib`.
- Crear pagina server que cargue datos iniciales cuando aplique.
- Crear wrapper cliente para interacciones.
- Mostrar errores al usuario con `toast` cuando sean accionables.
- No introducir una libreria nueva si el stack actual ya resuelve el caso.

Despues:

- Ejecutar `npm run build` si el cambio toca rutas, tipos, acciones o componentes compartidos.
- Ejecutar `npm test` si existen tests relevantes o si se agregan.
- Verificar que no se rompieron roles, tienda seleccionada ni query param `storeID`.

## Contratos front-back

Cuando el backend necesite cambiar o agregar endpoint:

- Definir metodo, ruta, query params y body.
- Definir respuesta exitosa y errores esperados.
- Mantener IDs con sufijo `ID`, no mezclar `id` si el resto del dominio usa `saleID`, `storeID`, etc.
- Enviar fechas ISO cuando sean datos de backend; para display usar utils de fecha.
- El backend debe devolver entidades completas o DTOs claros. Si devuelve wrapper `{ statusCode, data }`, el front ya lo soporta.
- El frontend debe conservar normalizadores para compatibilidad gradual, pero no debe esconder un contrato roto indefinidamente.

Formato sugerido para documentar un contrato nuevo:

```ts
// src/interfaces/<dominio>/<IEntidad>.ts
export interface ICreateX {
    storeID: string
    items: Array<{ variationID: string; quantity: number }>
}

export interface IXResponse {
    xID: string
    status: string
    createdAt: string
}
```

```ts
// src/actions/<dominio>/createX.ts
import { API_URL } from "@/lib/enviroments"
import { fetcher } from "@/lib/fetcher"

export async function createX(payload: ICreateX): Promise<IXResponse> {
    return fetcher<IXResponse>(`${API_URL}/x`, {
        method: "POST",
        body: JSON.stringify(payload),
    })
}
```

## Roles y tienda seleccionada

Roles actuales:

- `admin`
- `store_manager` (Vendedor)
- `consignado`
- `tercero`

La tienda seleccionada vive en `useTienda`. Muchas rutas conservan `storeID` en query params. Al agregar navegacion o paginas nuevas, mantener el `storeID` cuando sea relevante.

Reglas:

- No confiar en el rol del store cliente para seguridad.
- Al mutar datos por tienda, enviar `storeID` explicito si el contrato lo requiere.
- Validar en UI que exista tienda seleccionada para flujos dependientes, pero backend debe validar tambien.

## Ventas e inventario: reglas sensibles

- El carrito (`useSaleStore`) solo prepara la venta. El backend debe validar stock/precio/descuento.
- `createNewSale` envia `{ storeID, paymentType, items: [{ variationID, quantity, unitPrice }] }`.
- Despues de crear venta, el flujo actual actualiza estado a `Pagado` con `updateSaleStatus`.
- Inventario usa datos iniciales y filtros locales; la edicion inline llama acciones de producto y registra movimiento con `createInventoryMovement` cuando cambia stock.
- No crear logica nueva de descuento, stock o total final solo en UI. Si afecta dinero o stock, pedir/crear contrato backend.

## Estilo de codigo

- TypeScript estricto; evitar `any` nuevo salvo que se este encapsulando una respuesta legacy y se normalice enseguida.
- Preferir funciones puras en `src/utils` para transformaciones reusables.
- Preferir componentes pequenos por dominio en `src/components/<Modulo>`.
- Evitar refactors amplios no pedidos.
- Mantener textos de UI en espanol, siguiendo el tono actual.
- Usar `toPrice`/`Intl.NumberFormat` para CLP y utils existentes para fechas chilenas.

## Checklist rapida para agentes

- Lei archivos cercanos antes de tocar codigo.
- Use `src/actions` + `fetcher` para backend.
- Revise o defini interfaces TypeScript.
- Normalice respuestas fuera de componentes.
- Zustand solo guarda estado de UI/transitorio.
- Backend conserva reglas de negocio definitivas.
- Respete roles, tienda seleccionada y `storeID`.
- No rompi patrones visuales existentes.
- Corri build/test aplicable o indique por que no.
