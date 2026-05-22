import { and, asc, eq, inArray, like, or } from 'drizzle-orm'
import type { CheckoutInput, PosProduct, SaleTicket } from '../../shared/types'
import { getDb } from '../db/client'
import { categories, customers, products, saleItems, sales, stockMovements, users } from '../db/schema'
import { requireAuth, requireRole } from '../session'
import { writeAuditLog } from './audit.service'
import { getActiveOfferMap } from './offers.service'

function requireSalesAccess() {
  const user = requireAuth()
  return requireRole(user, ['admin', 'vendor'])
}

function toProductLabel(product: { name: string; size: string | null; color: string | null }) {
  return [product.name, product.size, product.color].filter(Boolean).join(' · ')
}

function normalizeCheckoutItems(input: CheckoutInput['items']) {
  const quantities = new Map<number, number>()

  for (const item of input) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('invalid_quantity')
    }

    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
  }

  return Array.from(quantities.entries()).map(([productId, quantity]) => ({ productId, quantity }))
}

export const salesService = {
  async searchProducts(search?: string): Promise<PosProduct[]> {
    requireSalesAccess()
    const db = getDb()
    const normalizedSearch = search?.trim()
    const term = normalizedSearch ? `%${normalizedSearch}%` : null

    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        categoryName: categories.name,
        size: products.size,
        color: products.color,
        priceInCents: products.price,
        stock: products.stock,
      })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(
        term
          ? and(eq(products.active, true), or(like(products.name, term), like(categories.name, term), like(products.sku, term)))
          : eq(products.active, true),
      )
      .orderBy(asc(products.name), asc(products.id))

    const activeOffers = await getActiveOfferMap(rows.map((row) => row.id))

    return rows.map((row) => {
      const activeOffer = activeOffers.get(row.id)
      const activeDiscountPercent = activeOffer?.discountPercent ?? 0

      return {
        ...row,
        activeDiscountPercent,
        priceWithDiscountInCents: Math.round(row.priceInCents * (100 - activeDiscountPercent) / 100),
      }
    })
  },

  async checkout(input: CheckoutInput): Promise<SaleTicket> {
    const user = requireSalesAccess()
    const db = getDb()
    const items = normalizeCheckoutItems(input.items)

    if (items.length === 0) {
      throw new Error('empty_sale')
    }

    return db.transaction(async (tx) => {
      const customer = typeof input.customerId === 'number'
        ? await tx.query.customers.findFirst({
            where: eq(customers.id, input.customerId),
          })
        : null

      if (typeof input.customerId === 'number' && !customer) {
        throw new Error('customer_not_found')
      }

      const requestedProductIds = items.map((item) => item.productId)
      const dbProducts = await tx.query.products.findMany({
        where: inArray(products.id, requestedProductIds),
      })

      const activeOffers = await getActiveOfferMap(requestedProductIds, tx)

      if (dbProducts.length !== requestedProductIds.length) {
        throw new Error('product_not_found')
      }

      const productById = new Map(dbProducts.map((product) => [product.id, product]))

      const lineItems = items.map((item) => {
        const product = productById.get(item.productId)

        if (!product) {
          throw new Error('product_not_found')
        }

        if (!product.active) {
          throw new Error('product_inactive')
        }

        if (product.stock < item.quantity) {
          throw new Error('insufficient_stock')
        }

        const discountPercent = activeOffers.get(product.id)?.discountPercent ?? 0
        const subtotalInCents = Math.round(item.quantity * product.price * (100 - discountPercent) / 100)

        return {
          product,
          quantity: item.quantity,
          discountPercent,
          subtotalInCents,
        }
      })

      const totalInCents = lineItems.reduce((accumulator, item) => accumulator + item.subtotalInCents, 0)

      const createdSale = await tx
        .insert(sales)
        .values({
          customerId: customer?.id ?? null,
          userId: user.id,
          paymentMethod: input.paymentMethod,
          total: totalInCents,
        })
        .returning()

      const sale = createdSale[0]

      await tx.insert(saleItems).values(
        lineItems.map((item) => ({
          saleId: sale.id,
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
          discountPercent: item.discountPercent,
          subtotal: item.subtotalInCents,
        })),
      )

      for (const item of lineItems) {
        await tx
          .update(products)
          .set({ stock: item.product.stock - item.quantity })
          .where(eq(products.id, item.product.id))

        await tx.insert(stockMovements).values({
          productId: item.product.id,
          userId: user.id,
          delta: -item.quantity,
          reason: 'sale',
          referenceId: sale.id,
          note: `Venta #${sale.id}`,
        })
      }

      await writeAuditLog({
        action: 'checkout',
        entity: 'sale',
        entityId: sale.id,
        payload: {
          customerId: customer?.id ?? null,
          paymentMethod: sale.paymentMethod,
          totalInCents,
          items: lineItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPriceInCents: item.product.price,
            discountPercent: item.discountPercent,
          })),
        },
        userId: user.id,
      }, tx)

      return {
        saleId: sale.id,
        createdAt: sale.createdAt,
        paymentMethod: sale.paymentMethod,
        totalInCents,
        seller: {
          id: user.id,
          name: user.name,
        },
        customer: customer
          ? {
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
            }
          : null,
        items: lineItems.map((item) => ({
          productId: item.product.id,
          productName: toProductLabel(item.product),
          quantity: item.quantity,
          unitPriceInCents: item.product.price,
          discountPercent: item.discountPercent,
          subtotalInCents: item.subtotalInCents,
        })),
      }
    })
  },

  async getTicket(saleId: number): Promise<SaleTicket> {
    requireSalesAccess()
    const db = getDb()

    const sale = await db
      .select({
        saleId: sales.id,
        createdAt: sales.createdAt,
        paymentMethod: sales.paymentMethod,
        totalInCents: sales.total,
        sellerId: users.id,
        sellerName: users.name,
        customerId: customers.id,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerEmail: customers.email,
      })
      .from(sales)
      .innerJoin(users, eq(users.id, sales.userId))
      .leftJoin(customers, eq(customers.id, sales.customerId))
      .where(eq(sales.id, saleId))
      .get()

    if (!sale) {
      throw new Error('sale_not_found')
    }

    const items = await db
      .select({
        productId: saleItems.productId,
        productName: products.name,
        size: products.size,
        color: products.color,
        quantity: saleItems.quantity,
        unitPriceInCents: saleItems.unitPrice,
        discountPercent: saleItems.discountPercent,
        subtotalInCents: saleItems.subtotal,
      })
      .from(saleItems)
      .innerJoin(products, eq(products.id, saleItems.productId))
      .where(eq(saleItems.saleId, saleId))
      .orderBy(asc(saleItems.id))

    return {
      saleId: sale.saleId,
      createdAt: sale.createdAt,
      paymentMethod: sale.paymentMethod,
      totalInCents: sale.totalInCents,
      seller: {
        id: sale.sellerId,
        name: sale.sellerName,
      },
      customer: sale.customerId
        ? {
            id: sale.customerId,
            name: sale.customerName ?? 'Consumidor final',
            phone: sale.customerPhone,
            email: sale.customerEmail,
          }
        : null,
      items: items.map((item) => ({
        productId: item.productId,
        productName: toProductLabel(item),
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        discountPercent: item.discountPercent,
        subtotalInCents: item.subtotalInCents,
      })),
    }
  },
}
