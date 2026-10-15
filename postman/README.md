# Prueba local de canales del master

La fixture `mocks/master-commerce.js` usa los campos de creación/edición
publicados por el ERP. No contiene un snapshot de OpenAPI. Sirve un tenant, una
tienda y un canal ficticios, y conserva en memoria los cambios realizados.

Desde la raíz de este frontend:

```powershell
postman simulation run postman/simulations/master-commerce.sim.yaml --port 4900 --output ndjson --no-history
```

En una terminal separada, configura solo para ese proceso:

```powershell
$env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:4900/erp'
npm run dev -- --hostname 127.0.0.1 --port 3002
```

Identidades ficticias aceptadas por la fixture:

- Bearer `master-demo-superadmin`: consulta y edición.
- Bearer `master-demo-support`: solo consulta.

El layout de la aplicación requiere cookies `auth_token` y
`auth_session_type=master`. El rol visible procede del estado
`master-auth-storage` de Zustand, con `state.masterUser.role` igual a
`SUPER_ADMIN` o `SUPPORT`. Usa estas identidades únicamente con la URL local
de la fixture; la autenticación del ERP real no se modifica.

Rutas de control exclusivas de la simulación:

- `GET /erp/__state`: canales actuales y cuerpos de escrituras recibidas.
- `POST /erp/__control` con `{"failNext":true}`: el siguiente PATCH devuelve
  403 y conserva el canal anterior.

La prueba de navegador del 15 de octubre verificó:

1. Activar ambos permisos y recuperarlos después de recargar.
2. Guardar ambos valores como `false`.
3. Conservar el formulario y mostrar el error cuando el ERP rechaza el PATCH.
4. Crear un canal con ambos permisos.
5. Mostrar los estados sin controles de edición al rol de soporte.

En la interfaz real: **Master → Ecommerce del tenant → Editar → Guardar cambios**.
Los pagos de prueba permitidos también pueden modificar stock e ingresos.

## Origen web en ventas

El contrato publicado de ventas se consulto el 15 de octubre de 2026. La fixture
`sale-payments.js` incluye la ampliacion aditiva `sale.commerce` definida en
`SaleDto` del ERP: `{origin: "WEB", paymentProvider, isTest}` o `null`.
Esta ampliacion necesita desplegar el backend; no requiere migracion.

Ejecuta la API simulada y luego las acciones reales del frontend:

```powershell
postman simulation run postman/simulations/sale-payments.sim.yaml --port 4901 --output ndjson
# En otra terminal del mismo repo:
node postman/checks/sale-payment-labels.cjs
```

Comprueba listado mixto, detalle, importe y desglose; no genera pagos de caja
para ventas web. La tarjeta credito/debito aun no se almacena en el ERP.
