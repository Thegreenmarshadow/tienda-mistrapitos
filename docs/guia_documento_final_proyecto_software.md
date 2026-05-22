# Guía Adaptada para el Documento Final — Mis Trapitos POS

## Proyecto

- **Nombre del sistema:** Mis Trapitos POS
- **Tipo de sistema:** Punto de venta de escritorio, 100% offline
- **Cliente / negocio:** Tienda de ropa Mis Trapitos
- **Materia:** Ingeniería de Software
- **Objetivo del documento:** Integrar en un solo trabajo final los requerimientos, diseño, arquitectura, desarrollo, pruebas, manual de uso y evidencias del sistema real implementado.

> Esta guía fue adaptada al proyecto existente. No usa ejemplos genéricos de Python o MVC clásico porque el sistema real está construido con **Electron + React + SQLite + Drizzle**.

---

# 1. Portada

La portada debe contener:

- Universidad
- Centro universitario
- División o departamento
- Materia
- Nombre del profesor
- Nombre del proyecto: **Mis Trapitos POS**
- Nombre del cliente o negocio
- Integrantes del equipo
- Código de alumno de cada integrante
- Fecha de entrega
- Lugar

**Título sugerido:**

> Documento Final del Proyecto de Software: Mis Trapitos POS

---

# 2. Introducción

En esta sección explicá el propósito general del proyecto.

Debe responder:

- ¿Qué problema se quiere resolver?
- ¿Qué tipo de negocio usa el sistema?
- ¿Qué tipo de sistema se desarrolló?
- ¿Por qué es útil para la operación diaria?
- ¿Qué contiene el documento final?

**Texto base sugerido:**

El presente documento describe el desarrollo de **Mis Trapitos POS**, un sistema de punto de venta de escritorio para una tienda de ropa. La aplicación fue diseñada para operar de manera **local y sin conexión a internet**, permitiendo gestionar productos, inventario, ventas, clientes, proveedores, promociones, usuarios, auditoría y reportes básicos desde una sola computadora. El objetivo principal es mejorar el control interno del negocio, reducir errores operativos y contar con trazabilidad sobre las acciones críticas del sistema.

---

# 3. Levantamiento de requerimientos

Esta sección documenta cómo se entendió la necesidad del negocio.

## 3.1 Objetivo del levantamiento

Explicar que se identificaron los procesos clave del negocio para definir el alcance del MVP: catálogo, inventario, ventas, clientes, proveedores, promociones, reportes y control de usuarios.

## 3.2 Contexto del negocio

- Tipo de negocio: tienda de ropa
- Operación principal: venta presencial
- Restricción principal: funcionamiento local/offline
- Necesidad central: controlar stock, ventas y usuarios desde una sola PC

## 3.3 Preguntas guía

Podés documentar preguntas como:

- ¿Cómo se administra actualmente el inventario?
- ¿Qué problemas aparecen al registrar ventas?
- ¿Cuántos roles distintos usan el sistema?
- ¿Se necesita trabajar sin internet?
- ¿Qué datos debe mostrar el ticket?
- ¿Cómo se controlan entradas de mercancía y ajustes?
- ¿Qué reportes necesita ver administración?

## 3.4 Necesidades detectadas

- Control de productos por categoría, talla, color y SKU/código
- Registro de stock inicial, entradas y ajustes
- Bloqueo de ventas sin stock suficiente
- Registro de ventas con método de pago
- Asociación opcional de cliente a la venta
- Gestión de proveedores
- Descuentos automáticos por ofertas vigentes
- Reportes básicos de ventas e inventario
- Gestión de usuarios con roles
- Auditoría de operaciones críticas
- Respaldo manual de la base de datos

---

# 4. Especificación de requerimientos

## 4.1 Propósito

Definir formalmente lo que el sistema debe hacer y las restricciones que condicionan la solución.

## 4.2 Alcance del sistema

**Dentro del alcance del MVP:**

- Gestión de usuarios locales
- Gestión de categorías, productos y proveedores
- Gestión de clientes
- POS para registrar ventas
- Control de inventario por movimientos
- Ofertas por producto con vigencia
- Reportes básicos de ventas e inventario
- Auditoría de acciones importantes
- Exportación e importación manual de la base de datos

**Fuera del alcance del MVP:**

- Tienda en línea
- Pagos por internet
- Multi-sucursal
- Multi-terminal por red
- App móvil
- Sincronización en la nube
- Devoluciones y notas de crédito
- Facturación electrónica
- Lector de código de barras e impresora térmica dedicada
- Reportes BI avanzados

## 4.3 Descripción general del producto

El sistema es una **aplicación de escritorio Electron** que corre en una única computadora del negocio. La persistencia se realiza con **SQLite local**, sin servidor intermedio y sin dependencias de red para el flujo normal de operación.

## 4.4 Usuarios del sistema

| Usuario | Descripción |
|---|---|
| Administrador | Gestiona usuarios, reportes, auditoría, respaldos y ajustes sensibles. |
| Vendedor | Registra ventas, busca productos, vincula clientes y emite ticket. |
| Almacenista | Gestiona catálogo, proveedores, entradas de stock y ofertas. |

## 4.5 Restricciones

- El sistema debe funcionar localmente.
- Debe operar sin internet.
- El acceso requiere usuario y contraseña.
- No se puede vender por encima del stock disponible.
- Los descuentos se aplican por ofertas configuradas, no manualmente en línea de venta.
- La base de datos vive en la PC del negocio.

## 4.6 Supuestos y dependencias

- El negocio dispone de al menos una computadora Windows.
- Los usuarios reciben capacitación básica.
- La información inicial será cargada dentro del sistema.
- El respaldo es manual mediante exportación de base de datos.

## 4.7 Requerimientos funcionales

| ID | Requerimiento | Descripción |
|---|---|---|
| RF-01 | Gestión de usuarios | Crear, editar, desactivar usuarios y resetear contraseñas. |
| RF-02 | Gestión de categorías | Crear, editar y eliminar categorías sin productos asociados. |
| RF-03 | Gestión de productos | Registrar, editar, activar y desactivar productos. |
| RF-04 | Gestión de proveedores | Registrar, editar y desactivar proveedores. |
| RF-05 | Gestión de clientes | Registrar, editar y consultar clientes con historial de compras. |
| RF-06 | Registro de ventas | Buscar productos, armar carrito, elegir método de pago y confirmar venta. |
| RF-07 | Control de inventario | Registrar entradas, ajustes y salidas automáticas por venta. |
| RF-08 | Bloqueo por stock | Impedir ventas cuando no haya stock suficiente. |
| RF-09 | Ofertas | Configurar descuentos por porcentaje con fecha de inicio y fin. |
| RF-10 | Reportes | Consultar ventas del día, del mes, por rango y estado del stock. |
| RF-11 | Auditoría | Registrar acciones críticas con usuario, entidad, fecha y terminal local. |
| RF-12 | Respaldo | Exportar e importar la base de datos manualmente. |

## 4.8 Requerimientos no funcionales

| ID | Requerimiento | Descripción |
|---|---|---|
| RNF-01 | Usabilidad | La interfaz debe ser entendible para personal no técnico. |
| RNF-02 | Seguridad | El acceso se controla por credenciales y rol. |
| RNF-03 | Disponibilidad | El sistema debe operar sin internet. |
| RNF-04 | Rendimiento | Las operaciones comunes deben responder rápido en la PC local. |
| RNF-05 | Integridad | Las ventas y el stock deben mantenerse consistentes. |
| RNF-06 | Mantenibilidad | El código debe estar modularizado por dominios y capas. |
| RNF-07 | Portabilidad | Debe distribuirse como instalador de escritorio para Windows. |

## 4.9 Reglas de negocio

- RN-01: No se puede vender un producto con stock insuficiente.
- RN-02: Toda venta registra método de pago.
- RN-03: El stock disminuye automáticamente al confirmar una venta.
- RN-04: Las entradas y ajustes generan movimientos de inventario.
- RN-05: El historial de ventas conserva snapshots de precio y descuento.
- RN-06: Solo el administrador puede gestionar usuarios, backups y auditoría.
- RN-07: El sistema debe registrar quién ejecutó operaciones críticas.

---

# 5. Propuesta de solución

## 5.1 Problemática

La tienda necesita dejar atrás el control manual o disperso de productos, ventas e inventario. Los errores más típicos son diferencias de stock, ventas mal registradas, falta de historial de clientes y poca trazabilidad sobre quién hizo cada cambio.

## 5.2 Solución propuesta

Se propone **Mis Trapitos POS**, una aplicación de escritorio para una sola PC del local, orientada a resolver el flujo completo del negocio sin depender de internet ni de servicios externos.

## 5.3 Beneficios esperados

- Mayor control del inventario
- Menos errores operativos
- Mejor trazabilidad de acciones
- Venta más rápida en mostrador
- Historial de clientes y compras
- Resguardo manual de la información

## 5.4 Tecnologías reales del proyecto

| Capa | Tecnología |
|---|---|
| Escritorio | Electron |
| UI | React 19 |
| Navegación | React Router v7 |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Persistencia | SQLite |
| Acceso a BD | better-sqlite3 |
| ORM / esquema | Drizzle ORM |
| Validación | Zod |
| Autenticación | bcrypt + tabla local de usuarios |
| Empaquetado | electron-builder (NSIS) |
| Versionado | Git + GitHub |

## 5.5 Justificación técnica

- **Electron** permite una app de escritorio sin backend remoto.
- **SQLite** simplifica la persistencia local y mantiene transacciones confiables.
- **better-sqlite3** funciona bien en contexto mono-PC.
- **React** permite una UI modular y mantenible.
- **Drizzle** aporta tipado y claridad en el modelo de datos.

---

# 6. Plan del proyecto

## 6.1 Objetivo del plan

Organizar el desarrollo del MVP en fases funcionales que puedan demostrarse.

## 6.2 Fases del proyecto

| Fase | Entregable |
|---|---|
| Fase 0 | Base Electron + SQLite + migración inicial |
| Fase 1 | Login, roles y shell principal |
| Fase 2 | Catálogo: categorías, productos y proveedores |
| Fase 3 | Clientes |
| Fase 4 | POS y ventas |
| Fase 5 | Ofertas e inventario |
| Fase 6 | Reportes, auditoría y backups |
| Fase 7 | Empaquetado Windows |

## 6.3 Roles del equipo

Documentar según su equipo real, por ejemplo:

- Análisis y levantamiento
- Diseño y documentación
- Desarrollo frontend/renderer
- Desarrollo main process / base de datos
- Pruebas y evidencias

## 6.4 Riesgos principales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Inconsistencia de stock | Alto | Transacciones atómicas en checkout e inventario |
| Pérdida de datos local | Alto | Exportación manual de BD |
| Errores por permisos | Medio | Rutas protegidas y validación por rol |
| Problemas al instalar en Windows | Medio | Empaquetado NSIS y validación manual |
| Confusión por alcance | Medio | Documentar claramente qué queda fuera del MVP |

---

# 7. Administración de la configuración

## 7.1 Plan de configuración

El proyecto usa Git para control de versiones. Los cambios deben quedar trazados por commit y por módulo funcional.

## 7.2 Estructura real del repositorio

```text
tienda-mis-trapitos/
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATA-MODEL.md
│   ├── USER-STORIES.md
│   ├── PACKAGING.md
│   └── guia_documento_final_proyecto_software.md
├── src/
│   ├── main/
│   │   ├── db/
│   │   ├── ipc/
│   │   ├── services/
│   │   └── index.ts
│   ├── preload/
│   │   └── index.ts
│   ├── renderer/
│   │   └── src/
│   │       ├── pages/
│   │       ├── features/
│   │       ├── components/
│   │       └── shared/
│   └── shared/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
└── components.json
```

## 7.3 Nomenclatura de ramas

Sugerencia compatible con el repo:

```text
main
feature/auth
feature/catalog
feature/pos
feature/inventory
feature/reports
fix/stock-validation
docs/documento-final
```

## 7.4 Nomenclatura de commits

Usar commits descriptivos con convención simple:

```text
feat: add sales report dashboard
fix: prevent checkout with insufficient stock
docs: adapt final project guide
refactor: split catalog ipc handlers
```

## 7.5 Reglas de codificación

- Separar responsabilidades entre `main`, `preload` y `renderer`
- No acceder a SQLite desde el renderer
- Validar inputs con Zod
- Mantener IPC por dominio
- Evitar duplicación de lógica
- No borrar datos históricos sensibles cuando afecte trazabilidad

## 7.6 Entornos

| Entorno | Uso |
|---|---|
| Desarrollo | Implementación y pruebas locales |
| Empaquetado | Generación del instalador Windows |
| Producción local | Uso del sistema en la PC del negocio |

---

# 8. Diseño del software

## 8.1 Diagrama de contexto

Debe mostrar:

- Sistema Mis Trapitos POS
- Administrador
- Vendedor
- Almacenista
- Cliente (actor externo indirecto)
- Proveedor (actor externo indirecto)

## 8.2 Casos de uso por rol

### Administrador

- Iniciar sesión
- Gestionar usuarios
- Consultar dashboard y reportes
- Consultar auditoría
- Ajustar stock
- Exportar base de datos
- Importar base de datos

### Vendedor

- Iniciar sesión
- Buscar producto
- Agregar productos al carrito
- Vincular cliente
- Confirmar venta
- Imprimir ticket
- Consultar historial de cliente

### Almacenista

- Gestionar categorías
- Gestionar productos
- Registrar proveedores
- Registrar entradas de stock
- Configurar ofertas
- Consultar stock

## 8.3 Arquitectura real del sistema

La arquitectura debe reflejar lo implementado:

```text
Renderer (React)
    ↓ IPC vía contextBridge
Preload
    ↓
Main process (Electron + servicios + SQLite)
    ↓
Base de datos local app.db
```

Explicá además:

- El renderer no toca Node ni SQLite directamente
- El main registra handlers IPC por dominio
- La base vive localmente en la PC del usuario

## 8.4 Diagrama de secuencia recomendado

Hacer el flujo de venta:

1. Usuario inicia sesión
2. Se valida credencial
3. Vendedor busca producto
4. Agrega producto al carrito
5. Sistema valida stock
6. Vendedor selecciona método de pago
7. Sistema registra la venta
8. Sistema crea items de venta
9. Sistema descuenta stock
10. Sistema registra auditoría
11. Sistema muestra ticket

## 8.5 Modelo de datos

El diagrama debe alinearse al schema real. Tablas principales:

```text
users
categories
suppliers
products
offers
customers
sales
sale_items
stock_movements
audit_log
```

Relaciones clave:

- Un usuario registra ventas, movimientos y auditoría
- Un producto pertenece a una categoría
- Un proveedor puede abastecer varios productos
- Una venta tiene muchos `sale_items`
- Un cliente puede tener muchas ventas
- Un producto puede tener ofertas
- Los cambios de stock se registran en `stock_movements`

---

# 9. Desarrollo del sistema

## 9.1 Descripción general

El sistema implementa un MVP de punto de venta local, orientado a cubrir la operación interna de una tienda de ropa en una sola computadora.

## 9.2 Módulos desarrollados

### Autenticación y sesión

- Login con usuario y contraseña
- Usuario seed inicial `admin / admin123`
- Cambio obligatorio de contraseña al primer acceso
- Sesión en memoria y navegación según rol

### Usuarios

- Alta de usuarios
- Edición de nombre y rol
- Reseteo de contraseña
- Desactivación de usuarios

### Catálogo

- Gestión de categorías
- Alta y edición de productos
- SKU/código, talla, color, precio y proveedor
- Activación / desactivación de productos

### Inventario

- Stock inicial al crear producto
- Entradas de mercancía
- Ajustes manuales
- Salida automática por venta
- Historial de movimientos

### Ventas / POS

- Búsqueda de productos por nombre, categoría o SKU
- Carrito de compra
- Método de pago: efectivo, tarjeta o transferencia
- Validación de stock
- Ticket post-venta con impresión vía diálogo del sistema operativo
- Confirmación antes de cerrar sesión si hay carrito pendiente

### Clientes

- Alta y edición de clientes
- Búsqueda
- Historial de compras
- Apertura del detalle de ticket histórico desde el historial
- Alta rápida desde el POS

### Auditoría

- Registro de acciones críticas con usuario, entidad, fecha y `terminalId` local
- Consulta filtrable por usuario, acción y fecha

### Proveedores

- Alta, edición y desactivación
- Relación con productos abastecidos

### Ofertas

- Descuento porcentual por producto
- Fecha de inicio y fin
- Aplicación automática en el POS

### Reportes y dashboard

- Ventas del día
- Ventas del mes
- Rango personalizado
- Productos con bajo stock
- Ofertas activas
- Resumen por método de pago

### Auditoría

- Registro de acciones críticas
- Filtro por usuario y fecha

### Respaldo

- Exportación manual de la base
- Importación manual con reinicio de la app

## 9.3 Evidencias recomendadas

Agregar capturas de:

- Login
- Cambio de contraseña inicial
- Dashboard admin
- Catálogo de productos
- Alta de proveedor
- Entrada de stock
- POS con carrito
- Ticket generado
- Historial de cliente
- Reportes
- Auditoría
- Exportación / importación de base

---

# 10. Código fuente

## 10.1 Contenido de la entrega técnica

El comprimido final debería incluir:

- Código fuente completo
- `package.json`
- Configuración Electron/Vite
- Scripts de ejecución
- Documentación en `docs/`
- Base de datos de ejemplo o instrucciones para generar la base

## 10.2 README sugerido para este proyecto

Si el repositorio no lo tiene todavía, agregalo con esta orientación:

```markdown
# Mis Trapitos POS

## Descripción
Punto de venta de escritorio, 100% offline, para una tienda de ropa.

## Stack
- Electron
- React
- Tailwind CSS
- SQLite
- better-sqlite3
- Drizzle ORM

## Requisitos
- Node.js
- npm

## Instalación
npm install

## Desarrollo
npm run dev

## Empaquetado Windows
npm run dist:win

## Usuario inicial
usuario: admin
contraseña: admin123

## Funcionalidades
- Usuarios y roles
- Catálogo
- Inventario
- POS y ventas
- Clientes
- Proveedores
- Ofertas
- Reportes
- Auditoría
- Backups manuales
```

---

# 11. Matriz de rastreabilidad

La matriz debe unir requerimiento, módulo, evidencia y archivo real.

**Ejemplo adaptado al proyecto:**

| ID | Requerimiento | Módulo | Archivo(s) relacionados | Evidencia | Estado |
|---|---|---|---|---|---|
| RF-01 | Gestión de usuarios | Usuarios | `src/main/services/users.service.ts`, `src/renderer/src/pages/users/UsersPage.tsx` | Captura alta/edición | Cumple |
| RF-03 | Gestión de productos | Catálogo | `src/main/services/catalog.service.ts`, `src/renderer/src/pages/catalog/CatalogPage.tsx` | Captura ABM | Cumple |
| RF-06 | Registro de ventas | POS | `src/main/services/sales.service.ts`, `src/renderer/src/pages/pos/PosPage.tsx` | Ticket y checkout | Cumple |
| RF-07 | Control de inventario | Inventario | `src/main/services/inventory.service.ts`, `src/renderer/src/pages/inventory/InventoryPage.tsx` | Captura entradas/ajustes | Cumple |
| RF-10 | Reportes | Dashboard | `src/main/services/reports.service.ts`, `src/renderer/src/pages/reports/ReportsPage.tsx` | Captura dashboard | Cumple |
| RF-11 | Auditoría | Auditoría | `src/main/services/audit-log.service.ts`, `src/renderer/src/pages/audit/AuditPage.tsx` | Captura auditoría | Cumple |

---

# 12. Pruebas del sistema

## 12.1 Objetivo

Demostrar que el sistema cumple con el flujo funcional esperado del MVP y que las restricciones críticas del negocio se respetan.

## 12.2 Enfoque de pruebas

En el estado actual del proyecto, la evidencia más importante es la **validación funcional/manual** del flujo real.

Podés mencionar:

- Pruebas funcionales manuales
- Pruebas de validación de reglas de negocio
- Pruebas de permisos por rol
- Pruebas de instalación/empaquetado en Windows

> No declares pruebas unitarias o de integración automáticas si no existen evidencias reales en el repositorio.

## 12.3 Casos de prueba sugeridos

| ID | Caso de prueba | Entrada | Resultado esperado |
|---|---|---|---|
| CP-01 | Login válido | `admin / admin123` | Acceso concedido y solicitud de cambio de contraseña |
| CP-02 | Login inválido | Usuario o contraseña incorrectos | Acceso rechazado |
| CP-03 | Crear producto | Datos válidos | Producto registrado |
| CP-04 | Crear categoría duplicada | Nombre ya existente | Validación de error |
| CP-05 | Venta con stock | Producto con stock suficiente | Venta registrada y ticket generado |
| CP-06 | Venta sin stock suficiente | Cantidad mayor al stock | Venta bloqueada |
| CP-07 | Oferta vigente | Producto con descuento activo | Total con descuento automático |
| CP-08 | Entrada de mercancía | Producto + cantidad válida | Stock incrementado |
| CP-09 | Exportar base | Acción admin | Archivo de backup generado |
| CP-10 | Importar base | Acción admin + confirmación | Base reemplazada y app reiniciada |

## 12.4 Evidencia de pruebas

Agregar capturas o registros donde se vea:

- Validación de credenciales
- Bloqueo por stock insuficiente
- Ticket emitido
- Aplicación de oferta
- Movimiento de inventario
- Dashboard con ventas
- Exportación / importación de base

---

# 13. Manual de usuario

## 13.1 Requisitos de uso

- Computadora con Windows
- Sistema instalado
- Usuario y contraseña válidos

## 13.2 Inicio de sesión

1. Abrir la aplicación.
2. Ingresar usuario y contraseña.
3. Si es el primer acceso del admin, cambiar la contraseña.

## 13.3 Menú principal por rol

- **Admin:** dashboard, productos, proveedores, inventario, ofertas, clientes, usuarios, auditoría
- **Vendedor:** POS y clientes
- **Almacenista:** productos, proveedores, inventario y ofertas

## 13.4 Gestión de productos

1. Entrar a Productos.
2. Crear categoría si todavía no existe.
3. Completar nombre, SKU/código, categoría, talla, color, precio y stock inicial.
4. Guardar.

## 13.5 Gestión de inventario

1. Entrar a Inventario.
2. Elegir registrar entrada o ajuste.
3. Seleccionar producto.
4. Indicar cantidad o delta.
5. Confirmar.

## 13.6 Registro de ventas

1. Entrar al POS.
2. Buscar producto por nombre, categoría o SKU.
3. Agregar unidades al carrito.
4. Vincular cliente si aplica.
5. Elegir método de pago.
6. Confirmar venta.
7. Revisar e imprimir ticket.
8. Si se intenta cerrar sesión con carrito pendiente, el sistema pide confirmación.

## 13.7 Clientes

- Registrar cliente nuevo
- Buscar cliente existente
- Consultar historial de compras
- Abrir el detalle de una venta histórica desde la ficha del cliente

## 13.8 Proveedores

- Registrar proveedor
- Editar datos
- Consultar cuántos productos abastece

## 13.9 Ofertas

1. Seleccionar producto.
2. Definir porcentaje de descuento.
3. Definir fecha de inicio y fin.
4. Guardar.

## 13.10 Reportes

- Consultar ventas del día
- Consultar ventas del mes
- Definir rango personalizado
- Ver productos con bajo stock

## 13.11 Backups

- **Exportar BD:** genera una copia manual de la base de datos
- **Importar BD:** reemplaza la base actual y reinicia la aplicación

## 13.12 Errores comunes

| Error | Causa probable | Solución |
|---|---|---|
| No inicia sesión | Credenciales incorrectas o usuario desactivado | Verificar datos o revisar usuario |
| No permite vender | Stock insuficiente | Revisar inventario |
| No se aplica descuento | Oferta fuera de vigencia | Revisar fechas |
| No se puede importar base | Archivo inválido | Seleccionar una base válida del sistema |

---

# 14. Video demostrativo

El documento final debe incluir un enlace al video del sistema funcionando.

## 14.1 Qué debe mostrar

1. Inicio de sesión
2. Cambio de contraseña inicial
3. Alta de categoría
4. Alta de producto
5. Alta de proveedor
6. Entrada de inventario
7. Alta o búsqueda de cliente
8. Registro de venta
9. Bloqueo por stock insuficiente
10. Aplicación automática de oferta
11. Consulta de dashboard/reportes
12. Consulta de auditoría
13. Exportación o importación de base

## 14.2 Formato en el documento

```text
Video demostrativo del sistema:
https://...
```

---

# 15. Conclusiones

En esta sección explicá:

- Qué se logró con el MVP
- Qué procesos del negocio quedaron cubiertos
- Qué restricciones se respetaron
- Qué aprendió el equipo en arquitectura, persistencia local, IPC y UX
- Qué mejoras pueden plantearse para una siguiente fase

**Mejoras futuras realistas:**

- Devoluciones
- Lector de código de barras
- Impresión térmica
- Reportes más avanzados (por ejemplo comparativas o márgenes)
- Multi-terminal
- Respaldo automático
- Sincronización en la nube

---

# 16. Referencias

Incluir referencias técnicas y académicas usadas:

- IEEE 830 o estándar equivalente de requerimientos
- Documentación oficial de Electron
- Documentación oficial de React
- Documentación oficial de SQLite
- Documentación de Drizzle ORM
- Documentación de Tailwind CSS
- Material de Ingeniería de Software de la materia

---

# 17. Anexos

Podés adjuntar:

- Diagramas UML
- Capturas del sistema
- Capturas de la base de datos
- Evidencia del instalador Windows
- Tabla de casos de prueba completos
- Link al repositorio

---

# Checklist final del documento

- [ ] El nombre del sistema dice **Mis Trapitos POS** en todo el documento
- [ ] El alcance coincide con el MVP real
- [ ] No se prometen features no implementadas
- [ ] La arquitectura coincide con Electron + React + SQLite
- [ ] La estructura del repo coincide con `src/main`, `src/preload`, `src/renderer`
- [ ] El modelo de datos usa las tablas reales del proyecto
- [ ] La matriz de rastreabilidad usa archivos reales
- [ ] Las pruebas documentadas tienen evidencia real
- [ ] El manual de usuario coincide con las pantallas actuales
- [ ] El video demuestra el flujo real implementado

---

# Pendientes importantes antes de la entrega

- Completar datos institucionales de la portada
- Insertar capturas reales del sistema
- Agregar diagramas actualizados
- Completar matriz de rastreabilidad completa
- Documentar resultados obtenidos en pruebas manuales
- Agregar README si todavía no existe en el repo
- Incluir link al video demostrativo
