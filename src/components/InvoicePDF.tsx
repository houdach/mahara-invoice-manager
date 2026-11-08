'use client'

import { MAHARA_LOGO } from '@/lib/logo'
import { BACKGROUND_PATTERN } from '@/lib/background'

type InvoiceItem = {
  id: string
  photo_base64: string | null
  photo_url: string | null
  quantity: number
  unit_price: number
  note?: string
}

type Client = {
  name: string
  phone?: string
  city?: string
}

type Payment = {
  id: string
  amount: number
  date: string
  origine?: string
  note?: string
}

type Props = {
  invoice: {
    number: string
    date: string
    total: number
    total_paid: number
    remaining: number
    ancien_solde?: number
    ancien_solde_note?: string
    clients: Client
    invoice_items: InvoiceItem[]
    payments?: Payment[]
  }
  hideConfidential?: boolean
}

const BURGUNDY = '#702434'
const INK = '#1a1a1a'
const GRAY_LINE = '#dcdcdc'
const GRAY_BG = '#f4f4f4'
const GRAY_TEXT = '#555555'

function chunkInvoiceItems(
  items: InvoiceItem[],
  hasPaymentsOrSolde: boolean,
  paymentCount: number
): InvoiceItem[][] {
  if (items.length <= 3 || (items.length === 4 && paymentCount <= 1)) {
    return [items]
  }

  const pages: InvoiceItem[][] = []
  const p1 = items.slice(0, 4)
  pages.push(p1)
  let remaining = items.slice(4)

  const maxOnLast = hasPaymentsOrSolde ? (paymentCount > 2 ? 3 : 4) : 6

  while (remaining.length > 0) {
    if (remaining.length <= maxOnLast) {
      pages.push(remaining)
      break
    }
    if (remaining.length <= 6 + maxOnLast) {
      const take = Math.min(6, Math.ceil(remaining.length / 2))
      pages.push(remaining.slice(0, take))
      remaining = remaining.slice(take)
    } else {
      pages.push(remaining.slice(0, 6))
      remaining = remaining.slice(6)
    }
  }

  return pages
}

export function InvoicePDFTemplate({ invoice, hideConfidential = false }: Props) {
  const itemsTotal = invoice.invoice_items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  )
  const ancienSolde = Number(invoice.ancien_solde || 0)
  const sortedPayments = [...(invoice.payments || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const totalPaid = sortedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const netRemaining = itemsTotal + ancienSolde - totalPaid

  const hasPaymentsOrSolde = ancienSolde > 0 || sortedPayments.length > 0

  const pageChunks = chunkInvoiceItems(
    invoice.invoice_items,
    hasPaymentsOrSolde,
    sortedPayments.length + (ancienSolde > 0 ? 1 : 0)
  )
  const totalPages = pageChunks.length

  return (
    <div
      id="invoice-pdf-template"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      {pageChunks.map((chunk, pageIndex) => {
        const isFirstPage = pageIndex === 0
        const isLastPage = pageIndex === totalPages - 1

        return (
          <div
            key={pageIndex}
            className="invoice-pdf-page"
            data-page-index={pageIndex}
            style={{
              width: '794px',
              height: '1123px',
              backgroundImage: `url(${BACKGROUND_PATTERN})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '12px',
              color: INK,
              padding: '40px',
              boxSizing: 'border-box',
              position: 'relative',
              pageBreakAfter: !isLastPage ? 'always' : 'auto',
              breakAfter: !isLastPage ? 'page' : 'auto',
            }}
          >
            {/* White card container */}
            <div
              style={{
                backgroundColor: 'white',
                width: '100%',
                height: '1043px',
                position: 'relative',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* ── HEADER ── */}
              {isFirstPage ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '24px 40px 18px',
                      borderBottom: `3px solid ${BURGUNDY}`,
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          width: '76px',
                          height: '76px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: `2px solid ${BURGUNDY}`,
                          flexShrink: 0,
                          backgroundColor: '#6B2332',
                        }}
                      >
                        <img
                          src={MAHARA_LOGO}
                          alt="Coopérative Al Mahara Al Hirafia"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '19px',
                            fontWeight: 'bold',
                            color: BURGUNDY,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                          }}
                        >
                          COOPÉRATIVE AL MAHARA AL HIRAFIA
                        </div>
                        <div style={{ fontSize: '11px', color: GRAY_TEXT, marginTop: '3px', fontWeight: '500' }}>
                          Marrakech, Maroc
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: BURGUNDY,
                        letterSpacing: '1px',
                      }}
                    >
                      FACTURE
                    </div>
                  </div>

                  {/* ── INFO SECTION (PAGE 1) ── */}
                  <div style={{ display: 'flex', gap: '24px', padding: '20px 40px 16px', flexShrink: 0 }}>
                    {/* Left: N°, Date, Lieu */}
                    <div style={{ flex: 1 }}>
                      {[
                        { label: 'N° :', value: invoice.number },
                        { label: 'Date :', value: new Date(invoice.date).toLocaleDateString('fr-MA') },
                        { label: 'Lieu :', value: `Marrakech, le ${new Date(invoice.date).toLocaleDateString('fr-MA')}` },
                      ].map((row) => (
                        <div key={row.label} style={{ display: 'flex', gap: '8px', marginBottom: '7px', fontSize: '11px' }}>
                          <span style={{ fontWeight: 'bold', color: BURGUNDY, minWidth: '110px' }}>{row.label}</span>
                          <span>{row.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Right: CLIENT box */}
                    <div
                      style={{
                        flex: 1,
                        border: `1px solid ${BURGUNDY}`,
                        borderRadius: '4px',
                        overflow: 'hidden',
                        alignSelf: 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: BURGUNDY,
                          color: 'white',
                          padding: '6px 12px',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          letterSpacing: '0.5px',
                        }}
                      >
                        CLIENT
                      </div>
                      <div style={{ padding: '8px 12px' }}>
                        {[
                          { label: 'Nom / Raison sociale :', value: invoice.clients.name },
                          { label: 'Tél :', value: invoice.clients.phone || '—' },
                          { label: 'Ville :', value: invoice.clients.city || '—' },
                        ].map((row) => (
                          <div key={row.label} style={{ display: 'flex', gap: '6px', marginBottom: '4px', fontSize: '11px' }}>
                            <span style={{ fontWeight: 'bold', color: BURGUNDY }}>{row.label}</span>
                            <span>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Compact Running Header for Page 2+ */
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 40px 14px',
                    borderBottom: `2px solid ${BURGUNDY}`,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `1.5px solid ${BURGUNDY}`,
                        flexShrink: 0,
                        backgroundColor: '#6B2332',
                      }}
                    >
                      <img
                        src={MAHARA_LOGO}
                        alt="Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: BURGUNDY, textTransform: 'uppercase' }}>
                        COOPÉRATIVE AL MAHARA AL HIRAFIA
                      </div>
                      <div style={{ fontSize: '10px', color: GRAY_TEXT }}>
                        Facture N° <strong>{invoice.number}</strong> · Marrakech, Maroc
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: BURGUNDY }}>
                      FACTURE (suite)
                    </div>
                    <div style={{ fontSize: '10px', color: GRAY_TEXT, fontWeight: 'bold', marginTop: '2px' }}>
                      Page {pageIndex + 1} / {totalPages}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ITEMS TABLE ── */}
              <div style={{ padding: '0 40px', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: BURGUNDY, color: 'white' }}>
                      {[
                        { label: 'Qté', align: 'center', width: '50px' },
                        { label: 'Photo & Désignation', align: 'left', width: 'auto' },
                        { label: 'Prix U. TTC', align: 'right', width: '120px' },
                        { label: 'Total TTC', align: 'right', width: '120px' },
                      ].map((h) => (
                        <th
                          key={h.label}
                          style={{
                            padding: '8px 12px',
                            textAlign: h.align as any,
                            fontWeight: 'bold',
                            fontSize: '11px',
                            width: h.width,
                          }}
                        >
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map((item, i) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: `1px solid ${GRAY_LINE}`,
                          backgroundColor: i % 2 === 0 ? 'white' : '#fafafa',
                        }}
                      >
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            color: BURGUNDY,
                            fontWeight: 'bold',
                            fontSize: '13px',
                          }}
                        >
                          {item.quantity}
                        </td>
                        <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {item.photo_base64 ? (
                              item.photo_url ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                  <a
                                    href={item.photo_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    data-photo-url={item.photo_url}
                                    style={{ display: 'block', lineHeight: 0 }}
                                  >
                                    <img
                                      src={item.photo_base64}
                                      alt="Voir photo"
                                      style={{
                                        width: '60px',
                                        height: '60px',
                                        objectFit: 'cover',
                                        borderRadius: '4px',
                                        border: `2px solid ${BURGUNDY}`,
                                        cursor: 'pointer',
                                      }}
                                    />
                                  </a>
                                  <a
                                    href={item.photo_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    data-photo-url={item.photo_url}
                                    style={{ fontSize: '8px', color: BURGUNDY, textDecoration: 'underline', fontWeight: 'bold' }}
                                  >
                                    🔍 Voir photo
                                  </a>
                                </div>
                              ) : (
                                <img
                                  src={item.photo_base64}
                                  alt=""
                                  style={{
                                    width: '60px',
                                    height: '60px',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    border: `1px solid ${GRAY_LINE}`,
                                    flexShrink: 0,
                                  }}
                                />
                              )
                            ) : (
                              <div
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  backgroundColor: GRAY_BG,
                                  borderRadius: '4px',
                                  border: `1px solid ${GRAY_LINE}`,
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            {item.note && (
                              <span style={{ fontSize: '11px', color: INK, fontStyle: 'italic' }}>
                                {item.note}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                          {Number(item.unit_price).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 'bold' }}>
                          {(item.quantity * item.unit_price).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* ── Subtotal for articles on last page ── */}
                  {isLastPage && hasPaymentsOrSolde && (
                    <tfoot>
                      <tr style={{ backgroundColor: '#FAF3EE', borderTop: `2px solid ${BURGUNDY}` }}>
                        <td
                          colSpan={3}
                          style={{
                            padding: '8px 12px',
                            fontWeight: 'bold',
                            color: BURGUNDY,
                            textAlign: 'right',
                            fontSize: '11px',
                          }}
                        >
                          Total des articles
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: BURGUNDY, fontSize: '11px' }}>
                          {itemsTotal.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* Continuation notice on non-last page */}
                {!isLastPage && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontSize: '10.5px',
                      color: BURGUNDY,
                      fontWeight: 'bold',
                      fontStyle: 'italic',
                    }}
                  >
                    Suite des articles sur la page suivante ({pageIndex + 2}/{totalPages}) →
                  </div>
                )}

                {/* ── PAYMENTS & ANCIEN SOLDE TABLE (ON LAST PAGE ONLY) ── */}
                {isLastPage && hasPaymentsOrSolde && (
                  <div style={{ marginTop: '12px' }}>
                    <div
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 'bold',
                        color: BURGUNDY,
                        marginBottom: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Règlements & Solde
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                      <thead>
                        <tr style={{ backgroundColor: GRAY_BG }}>
                          <th style={{ padding: '5px 10px', textAlign: 'left', fontWeight: 'bold', color: GRAY_TEXT, borderBottom: `1px solid ${GRAY_LINE}`, width: '22%' }}>Date</th>
                          <th style={{ padding: '5px 10px', textAlign: 'left', fontWeight: 'bold', color: GRAY_TEXT, borderBottom: `1px solid ${GRAY_LINE}`, width: '30%' }}>Désignation</th>
                          <th style={{ padding: '5px 10px', textAlign: 'left', fontWeight: 'bold', color: GRAY_TEXT, borderBottom: `1px solid ${GRAY_LINE}`, width: '23%' }}>Origine / Mode</th>
                          <th style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 'bold', color: GRAY_TEXT, borderBottom: `1px solid ${GRAY_LINE}`, width: '25%' }}>Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ancienSolde > 0 && (
                          <tr style={{ borderBottom: `1px solid ${GRAY_LINE}`, backgroundColor: '#FAF3EE77' }}>
                            <td style={{ padding: '5px 10px', color: GRAY_TEXT }}>—</td>
                            <td style={{ padding: '5px 10px', color: BURGUNDY, fontWeight: 'bold' }}>
                              Ancien solde
                              {invoice.ancien_solde_note && (
                                <span style={{ fontWeight: 'normal', color: GRAY_TEXT, fontStyle: 'italic', marginLeft: '6px' }}>
                                  ({invoice.ancien_solde_note})
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '5px 10px', color: GRAY_TEXT }}>Reliquat antérieur</td>
                            <td style={{ padding: '5px 10px', textAlign: 'right', color: BURGUNDY, fontWeight: 'bold' }}>
                              +{ancienSolde.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH
                            </td>
                          </tr>
                        )}

                        {sortedPayments.map((p) => (
                          <tr key={p.id} style={{ borderBottom: `1px solid ${GRAY_LINE}` }}>
                            <td style={{ padding: '5px 10px', color: INK }}>
                              {new Date(p.date).toLocaleDateString('fr-MA')}
                            </td>
                            <td style={{ padding: '5px 10px', color: INK }}>
                              {p.note || 'Paiement'}
                            </td>
                            <td style={{ padding: '5px 10px', color: INK }}>
                              {p.origine || '—'}
                            </td>
                            <td style={{ padding: '5px 10px', textAlign: 'right', color: '#2d7a4f', fontWeight: 'bold' }}>
                              -{Number(p.amount).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── FINAL TOTAL BANNER (ON LAST PAGE ONLY) ── */}
                {isLastPage && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: BURGUNDY,
                      color: 'white',
                      padding: '9px 14px',
                      marginTop: hasPaymentsOrSolde ? '10px' : '8px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '12.5px',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <span>TOTAL À RÉGLER</span>
                    <span>
                      {Math.max(0, netRemaining).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH
                      {netRemaining <= 0 && totalPaid > 0 && (
                        <span style={{ fontSize: '10px', fontWeight: 'normal', marginLeft: '8px', opacity: 0.9 }}>
                          (Facture soldée ✓)
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* ── FOOTER (ON EVERY PAGE) ── */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                <div style={{ borderTop: `1px solid ${GRAY_LINE}`, padding: '10px 40px 6px' }}>
                  <div style={{ fontWeight: 'bold', color: BURGUNDY, fontSize: '10.5px', textAlign: 'center', textTransform: 'uppercase' }}>
                    COOPÉRATIVE AL MAHARA AL HIRAFIA
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: BURGUNDY,
                    padding: '8px 40px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: 'white', fontSize: '8.5px' }}>
                    +212 606 662 336 · myhassan.mara68@gmail.com
                  </span>
                  {!hideConfidential && (
                    <>
                      <span style={{ color: 'white', fontSize: '8.5px' }}>I.C.E : 003016647000073</span>
                      <span style={{ color: 'white', fontSize: '8.5px' }}>IBAN : MA 145 450 21215 4999721 0006 10</span>
                    </>
                  )}
                </div>
                <div
                  style={{
                    backgroundColor: '#5a1d2a',
                    padding: '5px 40px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: 'white', fontSize: '8.5px', fontStyle: 'italic' }}>
                    Coopérative Al Mahara Al Hirafia · Marrakech, Maroc
                  </span>
                  <span style={{ color: 'white', fontSize: '8.5px', fontWeight: 'bold' }}>
                    Page {pageIndex + 1} / {totalPages}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
