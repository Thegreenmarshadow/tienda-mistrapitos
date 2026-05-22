# PRD — Mis Trapitos POS (Electron MVP)

**Versión:** 1.0
**Fecha:** 2026-05-11
**Owner técnico:** Zacarias Perez

---

## 1. Resumen ejecutivo

Sistema de Punto de Venta (POS) **de escritorio, 100% offline** para la tienda de ropa "Mis Trapitos". Aplicación **Electron** que corre en una sola PC del local, con base de datos SQLite local.

El objetivo es entregar un MVP funcional que cubra el flujo completo del negocio: gestionar inventario, vender, registrar clientes y consultar reportes básicos. **No hay servidor, ni sincronización a la nube, ni acceso por red, ni multi-terminal.** La PC donde se instala es el único punto de operación.

Este PRD se basa en la ERS IEEE-830 del equipo académico (`docs/2.2-...IEEE830...pdf`) y en los diagramas de diseño (`docs/4.1-Diseño...pdf`), pero **recorta el alcance** para entregar rápido un MVP usable.

---

## 2. Objetivos del MVP

| # | Objetivo | Cómo se mide |
|---|----------|--------------|
| O1 | Operar una venta completa en menos de 60 segundos | Cronometrar flujo: login → buscar producto → cobrar → emitir ticket en pantalla |
| O2 | Mantener inventario consistente al 100% tras cada venta | El stock se descuenta atómicamente con cada venta (transacción SQLite) |
| O3 | Permitir trabajo de los 3 roles sin pisarse | Login con rol → ve solo su menú |
| O4 | Funcionar sin internet | Desconectar la red y operar normalmente |
| O5 | Instalable con un doble clic en Windows | Instalador `.exe` (Squirrel/NSIS) sin pasos manuales |

---

## 3. Fuera de alcance (IMPORTANTE)

Para que el MVP salga rápido, **explícitamente no se implementa**:

- **RF-10 (ID de terminal):** sistema mono-PC. No hay multi-terminal.
- **Periféricos:** sin lector de código de barras, sin impresora térmica, sin cajón de dinero, sin báscula. Los tickets se muestran/imprimen vía PDF estándar del sistema operativo.
- **Acceso por red, sincronización entre PCs o backend remoto:** la BD vive en una única PC; la app no abre puertos ni hace requests HTTP en su flujo normal.
- **Backups automáticos programados:** solo exportación manual de la BD desde Admin.
- **Auto-updater de Electron, code signing, notarización Apple.**
- **Pagos en línea, integración con bancos o pasarelas.**
- **Reportes avanzados / BI / gráficos complejos:** solo listas y totales.
- **Devoluciones, notas de crédito, facturación electrónica (CFDI/SAT).**
- **Multi-idioma:** solo español.
- **Multi-sucursal, multi-empresa.**

Si se necesita algo de esta lista, se planifica como fase posterior, no como MVP.

---

## 4. Usuarios y roles

Tres roles, asignados al crear el usuario. Cada usuario tiene un solo rol.

| Rol | Acceso |
|-----|--------|
| **Administrador** | Todo: usuarios, productos, ventas, ajustes de inventario, reportes, log de auditoría, exportar BD |
| **Vendedor** | POS (registrar ventas), buscar productos, registrar clientes, ver historial de cliente |
| **Almacenista** | Productos (alta/edición/categorías), entradas de stock, proveedores |

Restricciones:
- Vendedor **no** modifica precios ni productos.
- Almacenista **no** entra al POS ni gestiona usuarios.
- Solo Admin ve el log de auditoría.

---

## 5. Stack técnico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Shell de escritorio | **Electron** + **electron-vite** | Empaquetado mono-PC; electron-vite unifica el build de main + preload + renderer |
| Renderer (UI) | **React 19** + **React Router v7** (SPA) | SPA pura: carga `index.html` local, sin servidor ni SSR |
| Estilos | **Tailwind v4** + **shadcn/ui** | Componentes accesibles listos; theming via CSS vars oklch |
| Validación | **Zod** | Schemas compartidos: IPC handlers en main + formularios en renderer |
| BD | **SQLite** vía **`better-sqlite3`** (síncrono, en main process) | Local, transaccional, síncrono = sin complejidad de async |
| ORM / migraciones | **Drizzle ORM** + **drizzle-kit** | Tipado fuerte end-to-end; migraciones generadas automáticamente |
| Auth | Tabla `users` + **bcrypt** | Usuarios locales en una PC; no se justifica framework externo |
| IPC renderer ↔ main | **`contextBridge`** + handlers tipados por dominio | Sin tRPC ni capas extra; directo y auditable |
| Estado renderer | Custom hooks (`useState` + `useEffect`) | SQLite local = latencia cero; no se necesita capa de cache |
| Empaquetado | **electron-builder** target NSIS (Windows) | Instalador `.exe` de un clic |

---

## 6. Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                  Electron App                        │
│                                                      │
│  ┌─────────────────┐         ┌──────────────────┐  │
│  │   Renderer      │  IPC    │   Main process   │  │
│  │  (React SPA)    │◄───────►│  (Node + SQLite) │  │
│  │                 │         │                  │  │
│  │  - React Router │         │  - better-sqlite3│  │
│  │  - shadcn UI    │         │  - Drizzle ORM   │  │
│  │  - Tailwind v4  │         │  - bcrypt        │  │
│  │  - Zod          │         │  - IPC handlers  │  │
│  └─────────────────┘         └──────────────────┘  │
│                                       │              │
│                                       ▼              │
│                          ┌────────────────────────┐ │
│                          │  app.db (SQLite local) │ │
│                          │  (userData/app.db)     │ │
│                          └────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Convención de IPC:** un canal por operación de dominio, namespaced.
Ejemplo: `products:list`, `products:create`, `sales:checkout`, `auth:login`.
El preload expone una API tipada (`window.api.products.list()`, etc.) vía `contextBridge`.

**Ubicación de la BD:** `app.getPath('userData')/app.db`. Las migraciones de Drizzle corren en el main al arrancar la app (idempotentes).

---

## 7. Funcionalidades del MVP

Las features están organizadas por módulo. Cada una mapea a uno o más RFs de la ERS.

### 7.1 Auth y sesión (RF-08)

- Pantalla de login (usuario + contraseña).
- Sesión en memoria del renderer (no JWT, no cookies — es local).
- Cerrar sesión vuelve al login.
- Si el vendedor tiene productos en el carrito del POS sin confirmar, se pide confirmación antes de salir.
- Admin puede crear/editar/desactivar usuarios y asignar rol.
- Contraseñas con bcrypt en BD.

**Out:** recuperación de contraseña por email, 2FA, política de expiración.

### 7.2 Productos (RF-01)

- ABM de productos con: nombre, SKU/código, descripción, categoría, talla, color, precio, stock actual, proveedor.
- Categorías administrables desde el propio sistema; el seed inicial no crea categorías por defecto.
- Búsqueda por nombre/categoría/SKU.

**Out:** variantes complejas (matriz talla×color como un solo producto padre — en MVP cada combinación es un producto). Imágenes opcionales en una fase posterior.

### 7.3 Inventario (RF-02)

- Stock se descuenta automáticamente al confirmar venta (en la misma transacción).
- Almacenista registra **entradas de mercancía** (suma stock + queda en log).
- Admin puede hacer **ajustes manuales** (mermas, correcciones).

**Out:** alertas push de stock bajo (solo indicador visual en lista). Conteos cíclicos.

### 7.4 Ofertas (RF-03)

- Asignar % de descuento + fecha inicio/fin a un producto.
- En POS, si la venta cae dentro del rango, el descuento se aplica automáticamente.

**Out:** ofertas combinadas (2x1, descuentos por categoría, cupones).

### 7.5 Clientes (RF-04)

- ABM de clientes: nombre, teléfono, email, dirección.
- Buscar cliente por nombre/teléfono.
- Vincular cliente a una venta (opcional — se permite venta sin cliente).
- Ver historial de compras de un cliente.
- Abrir el detalle histórico de una venta desde el historial del cliente.

**Out:** programa de puntos, segmentación, marketing.

### 7.6 Ventas / POS (RF-05)

- Pantalla de POS optimizada para vendedor:
  - Buscar producto por nombre o SKU, agregarlo al carrito.
  - Modificar cantidad, eliminar línea.
  - Vincular cliente (opcional).
  - Elegir método de pago: efectivo / tarjeta / transferencia.
  - Total con descuentos aplicados.
  - Confirmar → genera venta + descuenta stock + registra en log (transacción atómica).
- Vista del ticket en pantalla tras confirmar (imprimible vía diálogo nativo de OS).

**Out:** dividir pago entre métodos, propinas, descuentos manuales en línea, devoluciones.

### 7.7 Proveedores (RF-06)

- ABM de proveedores: nombre, teléfono, email, productos que suministra.
- Vista de productos por proveedor.

**Out:** órdenes de compra, recepción de mercancía contra orden.

### 7.8 Consultas / Reportes básicos (RF-07)

- Stock disponible (lista filtrable por categoría).
- Productos en oferta vigente.
- Historial de compras de un cliente.
- **Solo para Admin:** ventas del día / del mes (lista + totales por método de pago).

**Out:** gráficos, exportación a Excel, comparativas, márgenes.

### 7.9 Auditoría (RF-09)

- Cada operación crítica (venta, alta/edición/eliminación de producto, ajuste de stock, alta de usuario) escribe un registro en `audit_log` con: usuario, acción, entidad, fecha/hora, `terminalId` local y payload resumido (JSON).
- Vista para Admin: listar log con filtros por usuario y fecha.

**Out:** RF-10 como soporte multi-terminal por red — no aplica, mono-PC. Como apoyo de trazabilidad local, el log sí conserva `terminalId` de la máquina actual.

### 7.10 Utilidades del sistema

- Exportar BD: Admin descarga el `app.db` actual a una ruta elegida (backup manual).
- Importar BD: reemplazar la base actual desde un archivo (con confirmación).

---

## 8. Modelo de datos (resumen)

Tablas (Drizzle schema). Todas con `id` autoincremental y `created_at` / `updated_at`.

| Tabla | Campos clave |
|-------|--------------|
| `users` | username (unique), password_hash, name, role (`admin`/`vendor`/`stock`), active |
| `categories` | name (unique) |
| `suppliers` | name, phone, email |
| `products` | name, sku (unique, nullable), description, category_id (FK), size, color, price, stock, supplier_id (FK), active |
| `offers` | product_id (FK), discount_percent, start_at, end_at |
| `customers` | name, phone, email, address |
| `sales` | customer_id (FK, nullable), user_id (FK), total, payment_method, created_at |
| `sale_items` | sale_id (FK), product_id (FK), quantity, unit_price, discount_percent |
| `stock_movements` | product_id (FK), user_id (FK), delta (+/-), reason (`sale`/`entry`/`adjustment`), reference_id (nullable, FK lógica a sale) |
| `audit_log` | user_id (FK), action, entity, entity_id, terminal_id, payload (JSON), created_at |

**Reglas:**
- Todas las operaciones que tocan `stock` o `sales` corren en una **transacción**.
- `stock_movements` es la fuente de verdad de cómo cambió el stock; `products.stock` es un cache derivado.

---

## 9. Plan de implementación por fases

Cada fase es un entregable demoable. Sin estimaciones — se avanza cuando la fase está hecha.

### Fase 0 — Bootstrap Electron
- Agregar `electron`, `electron-builder` a deps.
- Configurar main process, preload, build renderer como SPA con Vite.
- Setear `better-sqlite3` y migraciones de Drizzle al arrancar.
- App vacía corriendo en ventana, conectada a SQLite.

### Fase 1 — Auth + roles + shell de UI
- Tabla `users`, seed de un admin inicial.
- Login funcional, sesión en renderer.
- Layout con sidebar que muestra menús según rol.
- Logout.

### Fase 2 — Catálogo (productos + categorías + proveedores)
- ABMs completos para Almacenista.
- Búsqueda y listado.

### Fase 3 — Clientes
- ABM y búsqueda.

### Fase 4 — POS + ventas
- Pantalla de POS para Vendedor.
- Confirmar venta = transacción atómica (sale + sale_items + stock_movements + decremento de products.stock).
- Vista de ticket post-venta.

### Fase 5 — Ofertas e inventario
- Ofertas con vigencia, aplicación automática en POS.
- Entradas de stock (Almacenista) y ajustes manuales (Admin).

### Fase 6 — Auditoría + reportes básicos
- `audit_log` escrito desde un wrapper común en todos los handlers críticos.
- Vistas de stock disponible, ofertas vigentes, ventas del día/mes (Admin).
- Exportar / importar BD.

### Fase 7 — Empaquetado
- `electron-builder` target NSIS para Windows.
- Instalador `.exe` que se prueba en una PC limpia.

---

## 10. Criterios de aceptación del MVP

El MVP se considera entregado cuando, en una PC Windows limpia:

1. Se instala con un doble clic en el `.exe`.
2. Al primer arranque, crea la BD vacía y permite login con un admin seed.
3. El admin puede crear los otros 2 usuarios (vendedor + almacenista).
4. El almacenista puede dar de alta categorías, proveedores, productos y registrar entrada de stock.
5. El vendedor puede hacer login, buscar un producto, registrar un cliente, vincularlo, cobrar y ver el ticket en pantalla — todo en menos de 60s.
6. El stock se descuenta correctamente y se ve reflejado en la vista de inventario al instante.
7. Se puede crear una oferta con vigencia y se aplica automáticamente en POS.
8. El admin ve el log de auditoría con cada operación realizada por cada usuario.
9. La app funciona con la red desconectada.
10. Admin puede exportar el `app.db` a una ubicación del sistema.

---

## 11. Riesgos y decisiones abiertas

| # | Riesgo / decisión | Estado |
|---|-------------------|--------|
| R1 | `better-sqlite3` requiere recompilación nativa por versión de Electron | Mitigación: `electron-rebuild` en postinstall |
| R2 | Sin code signing, Windows Defender / SmartScreen puede marcar el `.exe` | Aceptado para MVP — se mostrará advertencia al instalar |
| R3 | Empaquetar las migraciones de Drizzle con la app (`extraResources`) y resolver el path con `process.resourcesPath` cuando está `app.isPackaged` | A validar al cierre de Fase 7 |
| R4 | BD inicial: arranca vacía y se crea el admin seed en el primer run vía `src/main/db/seed.ts` | Decidido |

---

## 12. Referencias

- `docs/2.2-2.2-IEEE830-EmanuelPerez (4).pdf` — ERS original (10 RFs, 3 roles).
- `docs/3.1-PlanProyecto-EmanuelPerez (2).pdf` — Plan académico (no aplica al MVP, es contexto).
- `docs/4.1-Diseño-EmanuelPerez.pdf` — Diagramas de contexto, casos de uso, arquitectura, BD.
- `docs/5.2-DesignThinking-EmanuelPerez (1).pdf` — Filosofía MVP / iteración corta.
