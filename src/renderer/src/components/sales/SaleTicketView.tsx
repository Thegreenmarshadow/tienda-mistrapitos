import type { PaymentMethod, SaleTicket } from '../../../../shared/types'

type SaleTicketViewProps = {
  ticket: SaleTicket
}

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(valueInCents / 100)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getPaymentLabel(method: PaymentMethod) {
  switch (method) {
    case 'cash':
      return 'Efectivo'
    case 'card':
      return 'Tarjeta'
    case 'transfer':
      return 'Transferencia'
  }
}

export function SaleTicketView({ ticket }: SaleTicketViewProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Venta #{ticket.saleId}</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Mis Trapitos POS</h3>
          <p className="mt-1 text-sm text-slate-400">{formatDate(ticket.createdAt)} · {getPaymentLabel(ticket.paymentMethod)}</p>
        </div>
        <div className="text-right text-sm text-slate-300">
          <p>Vendedor: {ticket.seller.name}</p>
          <p>Cliente: {ticket.customer?.name ?? 'Consumidor final'}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {ticket.items.map((item) => (
          <article key={`${item.productId}-${item.productName}`} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-medium text-white">{item.productName}</h4>
                <p className="mt-1 text-sm text-slate-400">
                  {item.quantity} × {formatCurrency(item.unitPriceInCents)}
                  {item.discountPercent > 0 ? ` · ${item.discountPercent}% off` : ''}
                </p>
              </div>
              <span className="text-sm text-slate-200">{formatCurrency(item.subtotalInCents)}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-5">
        <p className="text-sm text-slate-400">Total confirmado</p>
        <p className="text-2xl font-semibold text-emerald-300">{formatCurrency(ticket.totalInCents)}</p>
      </div>
    </div>
  )
}
