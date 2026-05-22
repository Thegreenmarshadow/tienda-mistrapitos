# Estado actual del proyecto — Mis Trapitos POS

> Documento basado en el **código implementado hoy** en `src/main`, `src/preload`, `src/renderer` y `src/shared`.

## Resumen

`Mis Trapitos POS` ya funciona como una aplicación de escritorio **offline**, pensada para **una sola PC**, con **Electron + React + SQLite local**.

Hoy el proyecto ya cubre estos módulos principales:

- autenticación y sesión por roles
- gestión de usuarios
- catálogo de categorías, proveedores y productos
- clientes e historial comercial
- POS con carrito, checkout y ticket
- inventario con entradas, ajustes y movimientos
- ofertas automáticas por producto
- reportes básicos de ventas
- auditoría
- exportación e importación manual de base de datos

## Qué hace hoy el sistema

### 1. Autenticación y sesión

- login con `usuario + contraseña`
- validación de credenciales con `bcrypt`
- sesión en memoria
- cambio obligatorio de contraseña inicial
- cierre de sesión
- redirección automática según rol:
  - `admin` → `/dashboard`
  - `vendor` → `/pos`
  - `stock` → `/products`

Archivos clave:

- `src/main/ipc/auth.ts`
- `src/main/services/auth.service.ts`
- `src/main/session.ts`
- `src/renderer/src/pages/login/LoginPage.tsx`
- `src/renderer/src/pages/login/ChangePasswordPage.tsx`
- `src/renderer/src/App.tsx`

### 2. Roles y permisos

El sistema ya separa la operación por rol:

- **Admin**: dashboard, usuarios, auditoría, catálogo, inventario, ofertas, clientes
- **Vendor**: POS y clientes
- **Stock**: productos, proveedores, inventario y ofertas

La UI, las rutas y los handlers IPC respetan esa separación.

Archivos clave:

- `src/renderer/src/shared/layout.tsx`
- `src/renderer/src/shared/role-route.tsx`
- `src/main/ipc/*.ts`

### 3. Gestión de usuarios

- listado de usuarios
- alta de usuarios
- edición de nombre y rol
- activación/desactivación
- reseteo de contraseña
- protección para no dejar el sistema sin admin activo
- auditoría de cambios

Archivos clave:

- `src/main/ipc/users.ts`
- `src/main/services/users.service.ts`
- `src/renderer/src/pages/users/UsersPage.tsx`

### 4. Catálogo

#### Categorías

- listado
- alta
- edición
- eliminación con validación para impedir borrar categorías que aún tienen productos

#### Proveedores

- listado
- alta
- edición
- activación/desactivación
- consulta de productos asociados

#### Productos

- listado con filtros
- alta con stock inicial
- edición
- activación/desactivación lógica
- campo `sku / código` opcional y único
- soporte de `talla` y `color`
- relación con categoría y proveedor
- stock visible desde catálogo
- búsqueda por nombre, categoría o SKU

Archivos clave:

- `src/main/ipc/catalog.ts`
- `src/main/services/catalog.service.ts`
- `src/renderer/src/pages/catalog/CatalogPage.tsx`
- `src/renderer/src/pages/catalog/SuppliersPage.tsx`

### 5. Clientes

- listado y búsqueda
- alta
- edición
- historial resumido de compras por cliente
- apertura del detalle de ticket histórico desde el historial

Archivos clave:

- `src/main/ipc/customers.ts`
- `src/main/services/customers.service.ts`
- `src/renderer/src/pages/customers/CustomersPage.tsx`

### 6. POS / Ventas

- búsqueda de productos para venta por nombre, categoría o SKU
- carrito
- control de stock antes del checkout
- selección de método de pago:
  - efectivo
  - tarjeta
  - transferencia
- vinculación opcional de cliente
- checkout transaccional
- generación de ticket post-venta
- impresión desde la vista del ticket con `window.print()`
- registro de impacto en stock, historial y auditoría
- confirmación al cerrar sesión si el carrito tiene productos sin confirmar

Archivos clave:

- `src/main/ipc/sales.ts`
- `src/main/services/sales.service.ts`
- `src/renderer/src/pages/pos/PosPage.tsx`

### 7. Inventario

- listado de movimientos
- registro de entradas de mercadería
- ajustes manuales de stock
- validación para evitar stock negativo
- trazabilidad del cambio mediante `stock_movements`

Archivos clave:

- `src/main/ipc/inventory.ts`
- `src/main/services/inventory.service.ts`
- `src/renderer/src/pages/inventory/InventoryPage.tsx`

### 8. Ofertas

- alta de ofertas por producto
- edición
- eliminación
- vigencia con fecha de inicio y fin
- cálculo de estado:
  - `active`
  - `scheduled`
  - `expired`
- señalización visual de solapamientos
- aplicación automática de descuentos en POS cuando la oferta está vigente

Archivos clave:

- `src/main/ipc/offers.ts`
- `src/main/services/offers.service.ts`
- `src/renderer/src/pages/offers/OffersPage.tsx`
- `src/main/services/sales.service.ts`

### 9. Reportes y dashboard

- resumen de ventas del día, del mes o por rango personalizado
- totales por método de pago
- detalle de ventas del período
- indicadores de stock y ofertas vigentes en el dashboard admin
- acciones de respaldo desde la misma pantalla

Archivos clave:

- `src/main/ipc/reports.ts`
- `src/main/services/reports.service.ts`
- `src/renderer/src/pages/reports/ReportsPage.tsx`

### 10. Auditoría

- registro de operaciones críticas
- consulta paginada
- filtros por usuario, acción y fechas
- identificación local de terminal mediante `terminalId`
- visualización desde pantalla admin

Archivos clave:

- `src/main/ipc/audit.ts`
- `src/main/services/audit-log.service.ts`
- `src/main/services/audit.service.ts`
- `src/renderer/src/pages/audit/AuditPage.tsx`

### 11. Resguardo de base de datos

- exportación manual de la base actual
- importación de una base existente
- validación mínima de tablas requeridas
- reinicio de app luego de importar

Archivos clave:

- `src/main/ipc/system.ts`
- `src/main/services/system.service.ts`
- `src/renderer/src/pages/reports/ReportsPage.tsx`

## Arquitectura funcional actual

### Procesos

- **Main process**: lógica de negocio, SQLite, servicios e IPC
- **Preload**: expone `window.api`
- **Renderer**: SPA React con rutas protegidas y páginas por módulo

Archivos clave:

- `src/main/index.ts`
- `src/main/ipc/index.ts`
- `src/preload/index.ts`
- `src/renderer/src/App.tsx`

### Dominios IPC registrados hoy

- `auth`
- `users`
- `catalog`
- `customers`
- `sales`
- `offers`
- `inventory`
- `reports`
- `audit`
- `system`

Referencia:

- `src/shared/ipc-channels.ts`
- `src/main/ipc/index.ts`

## Base de datos actual

La app usa SQLite local en `app.getPath('userData')/app.db`.

Tablas implementadas hoy:

- `users`
- `categories`
- `suppliers`
- `products`
- `offers`
- `customers`
- `sales`
- `sale_items`
- `stock_movements`
- `audit_log`

Archivos clave:

- `src/main/db/client.ts`
- `src/main/db/schema.ts`
- `src/main/db/migrate.ts`

## Seed inicial actual

Hoy el seed crea únicamente un usuario administrador inicial:

- usuario: `admin`
- contraseña: `admin123`
- `mustChangePassword: true`

Referencia:

- `src/main/db/seed.ts`

## Diferencias entre documentación y código actual

Hay cosas importantes que conviene dejar explícitas para no confundir al equipo:

1. La documentación de arquitectura no está del todo alineada con la estructura actual del código.
2. El proyecto usa **migración SQL manual idempotente** en `src/main/db/migrate.ts`; no se ven migraciones generadas por Drizzle dentro del repo.
3. El seed actual no carga categorías predefinidas ni datos demo; solo crea el admin inicial.
4. RF-10 sigue fuera de alcance como multi-terminal, pero la auditoría ya guarda un `terminalId` local para trazabilidad mono-PC.

## Conclusión

El proyecto ya NO está en una etapa de maqueta. Hoy ya tiene un **MVP funcional bastante completo** para operación local:

- vende
- descuenta stock
- registra clientes
- administra catálogo
- gestiona usuarios
- audita acciones
- genera reportes básicos
- permite backup manual

Lo que más necesita ahora no es “inventar features”, sino **alinear documentación con el código real** y cerrar algunos detalles puntuales de experiencia y trazabilidad.
