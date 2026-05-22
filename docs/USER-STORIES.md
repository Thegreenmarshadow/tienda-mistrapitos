# User Stories — Mis Trapitos POS

Historias de usuario del MVP, agrupadas por rol. Cada historia tiene formato:

> **Como** [rol] **quiero** [acción] **para** [beneficio].
> **Criterios de aceptación:** lista verificable.

Las historias mapean a los RFs de la ERS y a las features del PRD.

---

## 1. Administrador

### US-A1 — Iniciar sesión inicial
> **Como** admin **quiero** entrar con un usuario seed la primera vez **para** poder configurar el sistema sin pasos manuales.

**AC:**
- Al primer arranque la BD se crea vacía con un único usuario `admin / admin123` (forzado a cambiar la contraseña en el primer login).
- Tras cambiar la contraseña, el sistema redirige al dashboard.

---

### US-A2 — Gestionar usuarios
> **Como** admin **quiero** crear, editar y desactivar usuarios **para** controlar quién opera el sistema.

**AC:**
- Puedo crear un usuario con: username (único), nombre, contraseña, rol (admin/vendor/stock).
- Puedo editar el nombre y resetear la contraseña.
- Puedo desactivar un usuario (no se borra; solo `active = false`).
- Un usuario desactivado no puede hacer login.
- No puedo desactivar el último admin activo.

---

### US-A3 — Ajustar inventario manualmente
> **Como** admin **quiero** corregir el stock de un producto **para** registrar mermas, robos o errores de conteo.

**AC:**
- Selecciono un producto, ingreso el delta (positivo o negativo) y un motivo de texto libre.
- El movimiento queda registrado en `stock_movements` con `reason = 'adjustment'`.
- El stock del producto se actualiza atómicamente.
- Queda en el log de auditoría con el payload del ajuste.

---

### US-A4 — Modificar precios
> **Como** admin **quiero** cambiar el precio de un producto **para** reflejar cambios de costo o estrategia.

**AC:**
- El cambio se aplica solo a ventas futuras, no afecta ventas pasadas (las `sale_items` guardan `unit_price` al momento de la venta).
- Cambio queda en log de auditoría.

---

### US-A5 — Ver reportes básicos
> **Como** admin **quiero** ver las ventas del día y del mes **para** tener noción del ingreso del negocio.

**AC:**
- Vista "Ventas del día": lista de ventas + total + breakdown por método de pago.
- Vista "Ventas del mes": mismo formato, agrupado por día.
- Filtro de rango personalizado opcional.
- Sin gráficos en MVP, solo tablas y totales.

---

### US-A6 — Consultar log de auditoría
> **Como** admin **quiero** revisar qué hizo cada empleado **para** trazabilidad ante incidentes.

**AC:**
- Lista paginada de eventos: fecha/hora, usuario, acción, entidad, payload resumido.
- Filtros: rango de fechas, usuario, tipo de acción.
- No editable (solo lectura).

---

### US-A7 — Exportar la base de datos
> **Como** admin **quiero** descargar una copia de la BD **para** tener un backup manual.

**AC:**
- Botón "Exportar BD" abre diálogo nativo de guardado.
- Se copia el `app.db` al destino elegido.
- Se confirma al usuario que el backup fue exitoso.

---

### US-A8 — Importar una base de datos
> **Como** admin **quiero** restaurar una BD desde un archivo **para** recuperarme de pérdida de datos.

**AC:**
- Botón "Importar BD" abre diálogo de selección de archivo.
- Confirmación explícita ("Esto reemplazará todos los datos actuales. ¿Continuar?").
- Tras confirmar, se reemplaza `app.db`, se reinicia la app y se vuelve al login.

---

## 2. Vendedor

### US-V1 — Hacer login
> **Como** vendedor **quiero** iniciar sesión rápido **para** empezar a atender al primer cliente del día.

**AC:**
- Login con username + contraseña.
- Tras login, el sistema abre directamente el POS (no dashboard).

---

### US-V2 — Buscar un producto y agregarlo al carrito
> **Como** vendedor **quiero** encontrar un producto rápido **para** no hacer esperar al cliente.

**AC:**
- Input de búsqueda con autofocus.
- Resultados se filtran al tipear (nombre, categoría).
- Click en un resultado lo agrega al carrito con cantidad 1.
- Si ya está en el carrito, incrementa la cantidad.
- Si el stock disponible es 0, no se puede agregar (mensaje claro).

---

### US-V3 — Modificar cantidad en el carrito
> **Como** vendedor **quiero** ajustar cantidades **para** corregir errores antes de cobrar.

**AC:**
- Botones +/- y campo numérico editable por línea.
- No se puede superar el stock disponible.
- Botón para eliminar la línea.
- El subtotal y total se recalculan al instante.

---

### US-V4 — Aplicar oferta automática
> **Como** vendedor **quiero** que el descuento de una oferta vigente se aplique solo **para** no equivocarme manualmente.

**AC:**
- Si el producto tiene una oferta activa (fecha actual entre `start_at` y `end_at`), el descuento se aplica al precio de la línea.
- La línea muestra el precio original tachado y el con descuento.
- El descuento queda guardado en `sale_items.discount_percent`.

---

### US-V5 — Vincular cliente a la venta
> **Como** vendedor **quiero** asociar un cliente a la venta **para** que quede en su historial de compras.

**AC:**
- Buscador de cliente por nombre o teléfono.
- Si no existe, puedo crearlo desde el mismo POS sin salir (modal con nombre, teléfono, email, dirección — solo nombre obligatorio).
- La venta puede confirmarse sin cliente (queda como cliente anónimo).

---

### US-V6 — Cobrar y confirmar venta
> **Como** vendedor **quiero** elegir el método de pago y confirmar **para** cerrar la venta.

**AC:**
- Selección de método: efectivo / tarjeta / transferencia.
- Botón "Confirmar venta" hace la transacción atómica:
  - Crea `sale` + `sale_items`.
  - Crea `stock_movements` con `reason = 'sale'` por cada item.
  - Decrementa `products.stock`.
  - Escribe en `audit_log`.
- Si falla algo (ej. stock insuficiente al momento de confirmar), nada se guarda y se muestra error.
- Tras confirmar, se muestra el ticket en pantalla.

---

### US-V7 — Ver el ticket post-venta
> **Como** vendedor **quiero** ver el ticket en pantalla **para** confirmar al cliente lo cobrado.

**AC:**
- Vista del ticket con: número de venta, fecha/hora, vendedor, cliente (si aplica), líneas (producto, cantidad, precio unitario, descuento, subtotal), total, método de pago.
- Botón "Imprimir" abre el diálogo nativo del OS (PDF o impresora estándar).
- Botón "Nueva venta" vuelve al POS limpio.

---

### US-V8 — Ver historial de un cliente
> **Como** vendedor **quiero** consultar las compras anteriores de un cliente **para** dar mejor atención.

**AC:**
- Desde la búsqueda de cliente, abrir su ficha.
- Lista de ventas pasadas con fecha, total, método de pago.
- Botón o acción explícita para abrir el detalle de una venta histórica.
- El detalle muestra líneas, cantidades, precio unitario, descuento, subtotal y total.

---

## 3. Almacenista

### US-S1 — Gestionar categorías
> **Como** almacenista **quiero** crear y editar categorías **para** organizar el catálogo.

**AC:**
- ABM simple: nombre único.
- No se puede borrar una categoría con productos asociados (mensaje claro).

---

### US-S2 — Gestionar productos
> **Como** almacenista **quiero** dar de alta y editar productos **para** mantener el catálogo al día.

**AC:**
- Formulario con: nombre, SKU/código, descripción, categoría, talla, color, precio, stock inicial, proveedor.
- Validaciones: nombre obligatorio, precio > 0, stock >= 0.
- Edición no permite tocar `stock` directamente (eso va por entradas/ajustes).
- Desactivar producto en lugar de borrar (mantiene historial de ventas intacto).

---

### US-S3 — Registrar entrada de mercancía
> **Como** almacenista **quiero** ingresar un lote de productos **para** sumar stock cuando llega del proveedor.

**AC:**
- Selecciono uno o más productos y cantidad por cada uno.
- Opcional: referencia (número de remito, factura).
- Confirmar crea `stock_movements` con `reason = 'entry'` y suma al stock atómicamente.
- Queda en log de auditoría.

---

### US-S4 — Gestionar proveedores
> **Como** almacenista **quiero** registrar proveedores **para** saber a quién contactar para reposición.

**AC:**
- ABM con nombre, teléfono, email.
- Vista de productos que provee cada proveedor.
- No se puede borrar un proveedor con productos asociados (se desactiva).

---

### US-S5 — Crear ofertas
> **Como** almacenista **quiero** poner un producto en oferta **para** que el descuento se aplique automáticamente en POS.

**AC:**
- Formulario: producto, % descuento (1-99), fecha inicio, fecha fin.
- Validación: fecha fin > fecha inicio.
- Una oferta vigente reemplaza a otra anterior del mismo producto (warning si hay solapamiento).

---

### US-S6 — Ver stock disponible
> **Como** almacenista **quiero** consultar qué hay en stock **para** decidir qué reponer.

**AC:**
- Lista de productos con: nombre, categoría, stock actual, proveedor.
- Filtro por categoría y por proveedor.
- Indicador visual para productos con stock < 5 (configurable a futuro, hardcodeado en MVP).

---

## 4. Historias transversales (todos los roles)

### US-X1 — Cerrar sesión
> **Como** cualquier usuario **quiero** cerrar sesión **para** que otro pueda entrar en la misma máquina.

**AC:**
- Botón "Cerrar sesión" en el header.
- Vuelve al login.
- Si hay un carrito en el POS sin confirmar, pide confirmación antes de salir.

---

### US-X2 — Trabajar sin internet
> **Como** cualquier usuario **quiero** que la app funcione sin internet **para** no depender de la red.

**AC:**
- Desconectar la red no afecta ninguna operación.
- No hay llamadas a servicios externos en el flujo normal.

---

## 5. Edge cases / escenarios negativos

Estos no son historias en sí, pero son casos que la implementación debe manejar:

| Caso | Comportamiento esperado |
|------|------------------------|
| Stock insuficiente al confirmar venta | Falla la transacción, mensaje claro al vendedor, no se descuenta nada |
| Dos vendedores intentan vender el último item | Solo uno cierra la venta; el otro recibe error de stock (en MVP mono-PC esto no aplica, pero el código debe ser correcto) |
| Login con credenciales inválidas | Mensaje genérico ("Usuario o contraseña incorrectos"), sin distinguir cuál falló |
| Login con usuario desactivado | Mismo mensaje genérico |
| Importar BD con schema incompatible | Se detecta, no se reemplaza, mensaje claro |
| App se cierra durante una venta sin confirmar | El carrito se pierde (es estado de UI, no se persiste) — comportamiento aceptado |
| BD corrupta al arrancar | Pantalla de error con instrucciones para importar backup |

---

## 6. Trazabilidad RF → US

| RF | Historias relacionadas |
|----|----------------------|
| RF-01 (productos) | US-S1, US-S2 |
| RF-02 (inventario auto) | US-V6, US-S3, US-A3 |
| RF-03 (ofertas) | US-S5, US-V4 |
| RF-04 (clientes) | US-V5, US-V8 |
| RF-05 (ventas) | US-V2, US-V3, US-V6, US-V7 |
| RF-06 (proveedores) | US-S4 |
| RF-07 (consultas) | US-V8, US-S6, US-A5 |
| RF-08 (login) | US-A1, US-V1, US-X1 |
| RF-09 (auditoría) | US-A6 (+ todas las US escriben al log) |
| RF-10 (terminal) | **N/A como multi-terminal**; se conserva `terminalId` local en auditoría para trazabilidad mono-PC |
