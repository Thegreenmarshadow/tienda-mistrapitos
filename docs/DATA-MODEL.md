# Modelo de Datos — Mis Trapitos POS

Schema completo de SQLite, definido como Drizzle ORM (TypeScript). Incluye tablas, columnas, relaciones, índices, reglas de integridad y semántica de cada campo.

---

## 1. Diagrama ER (resumen)

```
                  ┌─────────────┐
                  │   users     │
                  └──────┬──────┘
                         │ 1
                         │
                         │ *
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼ *               ▼ *               ▼ *
┌─────────────┐  ┌─────────────────┐  ┌──────────────┐
│   sales     │  │ stock_movements │  │  audit_log   │
└──────┬──────┘  └─────────┬───────┘  └──────────────┘
       │ 1                 │ *
       │                   │
       │ *                 ▼ 1
       ▼              ┌─────────────┐         ┌─────────────┐
┌─────────────┐       │  products   │◄────────┤  suppliers  │
│ sale_items  │──────►│             │ *     1 │             │
└─────────────┘ *   1 └──────┬──────┘         └─────────────┘
                             │ *
                             │
                             ▼ 1
                      ┌─────────────┐
                      │ categories  │
                      └─────────────┘

                      ┌─────────────┐
                      │   offers    │────► products (1)
                      └─────────────┘ *

                      ┌─────────────┐
                      │  customers  │◄────── sales (1, nullable)
                      └─────────────┘ 1   *
```

---

## 2. Convenciones generales

- Todas las tablas tienen `id INTEGER PRIMARY KEY AUTOINCREMENT`.
- Timestamps: `created_at`, `updated_at` (`TEXT` con ISO8601, default `CURRENT_TIMESTAMP`).
- Booleanos: `INTEGER` (0/1).
- Dinero: `INTEGER` representando centavos (evita problemas de float). Ej. $123.45 → `12345`.
- Strings: `TEXT`. Sin VARCHAR (SQLite no diferencia).
- Soft delete vía `active INTEGER NOT NULL DEFAULT 1` en lugar de borrar (preserva historial).
- FKs siempre con `ON DELETE RESTRICT` salvo cuando se documenta lo contrario.

---

## 3. Tablas

### 3.1 `users`

Empleados del sistema.

| Campo | Tipo | Constraints | Descripción |
|-------|------|------------|-------------|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `username` | TEXT | UNIQUE, NOT NULL | Login |
| `password_hash` | TEXT | NOT NULL | bcrypt, cost factor 10 |
| `name` | TEXT | NOT NULL | Nombre para mostrar |
| `role` | TEXT | NOT NULL, CHECK IN ('admin','vendor','stock') | |
| `active` | INTEGER | NOT NULL DEFAULT 1 | Soft delete |
| `must_change_password` | INTEGER | NOT NULL DEFAULT 0 | True para el seed inicial |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Trigger en update |

**Índices:** `UNIQUE(username)`.

**Reglas:**
- Al menos un usuario `role='admin' AND active=1` debe existir siempre (validación en servicio).
- El seed inicial crea `admin / admin123` con `must_change_password = 1`.

---

### 3.2 `categories`

Clasificación de productos.

| Campo | Tipo | Constraints |
|-------|------|------------|
| `id` | INTEGER | PK |
| `name` | TEXT | UNIQUE, NOT NULL |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TEXT | DEFAULT CURRENT_TIMESTAMP |

**Reglas:**
- No se puede borrar si hay `products.category_id` apuntando a ella.

---

### 3.3 `suppliers`

Proveedores.

| Campo | Tipo | Constraints |
|-------|------|------------|
| `id` | INTEGER | PK |
| `name` | TEXT | NOT NULL |
| `phone` | TEXT | NULL |
| `email` | TEXT | NULL |
| `active` | INTEGER | NOT NULL DEFAULT 1 |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TEXT | DEFAULT CURRENT_TIMESTAMP |

**Reglas:**
- Soft delete (`active = 0`) si tiene productos asociados.

---

### 3.4 `products`

Productos del catálogo.

| Campo | Tipo | Constraints | Descripción |
|-------|------|------------|-------------|
| `id` | INTEGER | PK | |
| `name` | TEXT | NOT NULL | |
| `sku` | TEXT | NULL, UNIQUE | Código opcional del producto |
| `description` | TEXT | NULL | |
| `category_id` | INTEGER | NOT NULL, FK → categories.id | |
| `supplier_id` | INTEGER | NULL, FK → suppliers.id | Puede no tener proveedor cargado |
| `size` | TEXT | NULL | "S", "M", "L", "42", etc. — texto libre |
| `color` | TEXT | NULL | |
| `price` | INTEGER | NOT NULL CHECK (price > 0) | Centavos |
| `stock` | INTEGER | NOT NULL DEFAULT 0 CHECK (stock >= 0) | Cache derivado de `stock_movements` |
| `active` | INTEGER | NOT NULL DEFAULT 1 | |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | |

**Índices:**
- `INDEX idx_products_category ON products(category_id)`
- `INDEX idx_products_supplier ON products(supplier_id)`
- `INDEX idx_products_active ON products(active)`
- `INDEX idx_products_name ON products(name)` — para búsqueda
- `UNIQUE INDEX idx_products_sku_unique ON products(sku)` — para evitar códigos repetidos

**Reglas:**
- `stock` solo se modifica vía servicios que también escriben `stock_movements`. Nunca SET directo desde un handler.
- En MVP, cada combinación `(name, size, color)` es un producto distinto. No hay tabla `product_variants`.

---

### 3.5 `offers`

Descuentos vigentes por producto.

| Campo | Tipo | Constraints |
|-------|------|------------|
| `id` | INTEGER | PK |
| `product_id` | INTEGER | NOT NULL, FK → products.id |
| `discount_percent` | INTEGER | NOT NULL CHECK (discount_percent BETWEEN 1 AND 99) |
| `start_at` | TEXT | NOT NULL (ISO8601) |
| `end_at` | TEXT | NOT NULL (ISO8601) |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP |

**Índices:**
- `INDEX idx_offers_product ON offers(product_id)`
- `INDEX idx_offers_dates ON offers(start_at, end_at)` — para query de "ofertas activas"

**Reglas:**
- `end_at > start_at` (validación en servicio).
- Una oferta "activa" es aquella donde `start_at <= now() <= end_at`.
- Si hay solapamiento entre dos ofertas del mismo producto, se aplica la más reciente (mayor `id`). El servicio puede mostrar warning, pero la BD lo permite.

---

### 3.6 `customers`

Clientes finales.

| Campo | Tipo | Constraints |
|-------|------|------------|
| `id` | INTEGER | PK |
| `name` | TEXT | NOT NULL |
| `phone` | TEXT | NULL |
| `email` | TEXT | NULL |
| `address` | TEXT | NULL |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TEXT | DEFAULT CURRENT_TIMESTAMP |

**Índices:**
- `INDEX idx_customers_name ON customers(name)`
- `INDEX idx_customers_phone ON customers(phone)`

**Reglas:**
- Sin soft delete; los clientes se mantienen para historial.

---

### 3.7 `sales`

Cabecera de venta.

| Campo | Tipo | Constraints | Descripción |
|-------|------|------------|-------------|
| `id` | INTEGER | PK | Número de venta |
| `customer_id` | INTEGER | NULL, FK → customers.id | NULL = venta sin cliente |
| `user_id` | INTEGER | NOT NULL, FK → users.id | Vendedor que cobró |
| `total` | INTEGER | NOT NULL CHECK (total >= 0) | Centavos, ya con descuentos |
| `payment_method` | TEXT | NOT NULL CHECK IN ('cash','card','transfer') | |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | |

**Índices:**
- `INDEX idx_sales_customer ON sales(customer_id)`
- `INDEX idx_sales_user ON sales(user_id)`
- `INDEX idx_sales_date ON sales(created_at)` — para reportes

**Reglas:**
- Inmutable después de crear. Si hay error, se revierte la transacción completa.
- En MVP no hay devoluciones (no hay flag `voided`).

---

### 3.8 `sale_items`

Líneas de venta.

| Campo | Tipo | Constraints | Descripción |
|-------|------|------------|-------------|
| `id` | INTEGER | PK | |
| `sale_id` | INTEGER | NOT NULL, FK → sales.id ON DELETE CASCADE | |
| `product_id` | INTEGER | NOT NULL, FK → products.id | |
| `quantity` | INTEGER | NOT NULL CHECK (quantity > 0) | |
| `unit_price` | INTEGER | NOT NULL CHECK (unit_price >= 0) | Snapshot del precio al momento |
| `discount_percent` | INTEGER | NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 99) | Snapshot de la oferta aplicada |
| `subtotal` | INTEGER | NOT NULL | `quantity * unit_price * (100 - discount_percent) / 100` |

**Índices:**
- `INDEX idx_sale_items_sale ON sale_items(sale_id)`
- `INDEX idx_sale_items_product ON sale_items(product_id)`

**Reglas:**
- `unit_price` y `discount_percent` se guardan como snapshot — cambios futuros en `products.price` o en `offers` no alteran ventas pasadas.
- `subtotal` se calcula y persiste al insertar (denormalización justificada para reportes rápidos).

---

### 3.9 `stock_movements`

Source of truth de los cambios de stock.

| Campo | Tipo | Constraints | Descripción |
|-------|------|------------|-------------|
| `id` | INTEGER | PK | |
| `product_id` | INTEGER | NOT NULL, FK → products.id | |
| `user_id` | INTEGER | NOT NULL, FK → users.id | Quién originó el movimiento |
| `delta` | INTEGER | NOT NULL CHECK (delta != 0) | Positivo (entrada) o negativo (salida) |
| `reason` | TEXT | NOT NULL CHECK IN ('sale','entry','adjustment') | |
| `reference_id` | INTEGER | NULL | FK lógica: si reason='sale', es sales.id |
| `note` | TEXT | NULL | Texto libre, sobre todo para 'adjustment' |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | |

**Índices:**
- `INDEX idx_stock_movements_product ON stock_movements(product_id)`
- `INDEX idx_stock_movements_date ON stock_movements(created_at)`
- `INDEX idx_stock_movements_reason ON stock_movements(reason)`

**Reglas:**
- Append-only. Nunca se actualiza ni borra.
- Para reconstruir stock real: `SUM(delta) WHERE product_id = X`. `products.stock` debe coincidir; si no, hay bug.

---

### 3.10 `audit_log`

Registro de operaciones críticas.

| Campo | Tipo | Constraints | Descripción |
|-------|------|------------|-------------|
| `id` | INTEGER | PK | |
| `user_id` | INTEGER | NOT NULL, FK → users.id | |
| `action` | TEXT | NOT NULL | Ej: `product.create`, `sale.checkout`, `user.deactivate` |
| `entity` | TEXT | NOT NULL | Ej: `product`, `sale`, `user` |
| `entity_id` | INTEGER | NULL | ID del recurso afectado |
| `terminal_id` | TEXT | NOT NULL | Identificador local de la máquina actual |
| `payload` | TEXT | NOT NULL | JSON serializado con datos relevantes |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | |

**Índices:**
- `INDEX idx_audit_log_user ON audit_log(user_id)`
- `INDEX idx_audit_log_entity ON audit_log(entity, entity_id)`

**Reglas:**
- Append-only. Se escribe desde el servicio, idealmente dentro de la misma transacción que la operación auditada.
- `payload` no debe contener secrets (passwords, hashes).

---

## 4. Schema Drizzle (esqueleto)

```ts
// src/main/db/schema.ts
import { sqliteTable, integer, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'vendor', 'stock'] }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sku: text('sku').unique(),
  description: text('description'),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  size: text('size'),
  color: text('color'),
  price: integer('price').notNull(),
  stock: integer('stock').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  categoryIdx: index('idx_products_category').on(t.categoryId),
  supplierIdx: index('idx_products_supplier').on(t.supplierId),
  activeIdx: index('idx_products_active').on(t.active),
  nameIdx: index('idx_products_name').on(t.name),
  skuIdx: uniqueIndex('idx_products_sku_unique').on(t.sku),
}));

export const offers = sqliteTable('offers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  discountPercent: integer('discount_percent').notNull(),
  startAt: text('start_at').notNull(),
  endAt: text('end_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  productIdx: index('idx_offers_product').on(t.productId),
  datesIdx: index('idx_offers_dates').on(t.startAt, t.endAt),
}));

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  nameIdx: index('idx_customers_name').on(t.name),
  phoneIdx: index('idx_customers_phone').on(t.phone),
}));

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').references(() => customers.id),
  userId: integer('user_id').notNull().references(() => users.id),
  total: integer('total').notNull(),
  paymentMethod: text('payment_method', { enum: ['cash', 'card', 'transfer'] }).notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  customerIdx: index('idx_sales_customer').on(t.customerId),
  userIdx: index('idx_sales_user').on(t.userId),
  dateIdx: index('idx_sales_date').on(t.createdAt),
}));

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  discountPercent: integer('discount_percent').notNull().default(0),
  subtotal: integer('subtotal').notNull(),
}, (t) => ({
  saleIdx: index('idx_sale_items_sale').on(t.saleId),
  productIdx: index('idx_sale_items_product').on(t.productId),
}));

export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  userId: integer('user_id').notNull().references(() => users.id),
  delta: integer('delta').notNull(),
  reason: text('reason', { enum: ['sale', 'entry', 'adjustment'] }).notNull(),
  referenceId: integer('reference_id'),
  note: text('note'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  productIdx: index('idx_stock_movements_product').on(t.productId),
  dateIdx: index('idx_stock_movements_date').on(t.createdAt),
  reasonIdx: index('idx_stock_movements_reason').on(t.reason),
}));

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: integer('entity_id'),
  terminalId: text('terminal_id').notNull().default('unknown-terminal'),
  payload: text('payload').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  userIdx: index('idx_audit_log_user').on(t.userId),
  entityIdx: index('idx_audit_log_entity').on(t.entity, t.entityId),
}));
```

---

## 5. Queries de referencia

### 5.1 Productos en oferta vigente

```sql
SELECT p.*, o.discount_percent, o.end_at
FROM products p
JOIN offers o ON o.product_id = p.id
WHERE p.active = 1
  AND datetime('now') BETWEEN o.start_at AND o.end_at
ORDER BY p.name;
```

### 5.2 Stock real reconstruido (validación)

```sql
SELECT p.id, p.stock AS cached, COALESCE(SUM(sm.delta), 0) AS computed
FROM products p
LEFT JOIN stock_movements sm ON sm.product_id = p.id
GROUP BY p.id
HAVING cached != computed;
```

Si esta query devuelve filas, hay un bug en algún servicio que tocó `products.stock` sin escribir `stock_movements`.

### 5.3 Ventas del día por método de pago

```sql
SELECT payment_method, COUNT(*) AS qty, SUM(total) AS total_cents
FROM sales
WHERE date(created_at) = date('now')
GROUP BY payment_method;
```

### 5.4 Historial de un cliente

```sql
SELECT s.id, s.created_at, s.total, s.payment_method
FROM sales s
WHERE s.customer_id = ?
ORDER BY s.created_at DESC;
```

---

## 6. Reglas de integridad transversales

1. **Stock nunca negativo.** Garantizado por `CHECK (stock >= 0)` y por revalidación dentro de la transacción de checkout.
2. **Sale items snapshot.** `unit_price` y `discount_percent` se copian a la línea — cambios posteriores en `products.price` u `offers` no afectan ventas pasadas.
3. **Auditoría obligatoria.** Toda mutación pasa por un service que llama a `audit.log()`. No se permite escribir a las tablas desde un handler sin pasar por service.
4. **Soft delete sobre delete.** `users`, `products`, `suppliers` usan `active = 0`. `categories` y `customers` no se borran (la primera por integridad referencial estricta, la segunda para preservar historial).
5. **`stock_movements` append-only.** No hay servicios de UPDATE/DELETE sobre esta tabla.

---

## 7. Migración inicial (esqueleto)

Generada con `drizzle-kit generate`. El primer `0000_initial.sql` debe contener:

1. Crear todas las tablas en orden (respetando FKs).
2. Crear todos los índices.
3. **No insertar datos.** El seed del admin se hace por código (`src/main/db/seed.ts`) para usar bcrypt.

---

## 8. Lo que NO está en el modelo (descartado del MVP)

| Concepto | Razón |
|----------|-------|
| `terminals` / `terminal_id` en sales | RF-10 multi-terminal sigue fuera de alcance; la trazabilidad local se resuelve con `terminal_id` en `audit_log` |
| `product_variants` (matriz talla×color) | Cada combinación es un producto separado en MVP |
| `images` / `product_images` | Sin soporte de imágenes en MVP |
| `returns` / `voided` flag | Sin devoluciones en MVP |
| `cash_register_sessions` (apertura/cierre de caja) | No requerido por la ERS |
| `tax` / IVA | No mencionado en la ERS, queda fuera |
| `payment_splits` (varios métodos en una venta) | No requerido |
| Relación many-to-many `products ↔ suppliers` | En MVP cada producto tiene un único proveedor |
