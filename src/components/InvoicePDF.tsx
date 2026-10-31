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

export function InvoicePDFTemplate({ invoice, hideConfidential = false }: Props) {
  const itemsTotal = invoice.invoice_items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  )
  const ancienSolde = Number(invoice.ancien_solde || 0)
  const sortedPayments = [...(invoice.payments || [])]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const totalPaid = sortedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  // Total containing what he should pay: (itemsTotal + ancienSolde - totalPaid)
  const netRemaining = (itemsTotal + ancienSolde) - totalPaid

  const hasPaymentsOrSolde = ancienSolde > 0 || sortedPayments.length > 0

  return (
    <div
      id="invoice-pdf-template"
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
      }}
    >
      {/* White card — flex column so footer is pushed to bottom */}
      <div
        style={{
          backgroundColor: 'white',
          width: '100%',
          height: '1043px',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {/* ── HEADER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '28px 40px 20px', borderBottom: `3px solid ${BURGUNDY}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src={MAHARA_LOGO}
              alt="Mahara Style"
              style={{ width: '76px', height: '76px', objectFit: 'contain', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: '21px', fontWeight: 'bold', color: BURGUNDY, letterSpacing: '0.5px' }}>
                MAHARA STYLE
              </div>
              <div style={{ fontSize: '10px', color: GRAY_TEXT, marginTop: '3px' }}>
                COOPÉRATIVE AL MAHARA AL HIRAFIA
              </div>
              <div style={{ fontSize: '10px', color: GRAY_TEXT, marginTop: '2px' }}>
                Marrakech, Maroc
              </div>
            </div>
          </div>
          <div style={{ fontSize: '34px', fontWeight: 'bold', color: BURGUNDY, letterSpacing: '1px' }}>
            FACTURE
          </div>
        </div>

        {/* ── INFO SECTION ── */}
        <div style={{ display: 'flex', gap: '24px', padding: '24px 40px', flexShrink: 0 }}>
          {/* Left: N°, Date, Lieu */}
          <div style={{ flex: 1 }}>
            {[
              { label: 'N° :', value: invoice.number },
              { label: 'Date :', value: new Date(invoice.date).toLocaleDateString('fr-MA') },
              { label: 'Lieu :', value: `Marrakech, le ${new Date(invoice.date).toLocaleDateString('fr-MA')}` },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', gap: '8px', marginBottom: '7px', fontSize: '11px' }}>
                <span style={{ fontWeight: 'bold', color: BURGUNDY, minWidth: '120px' }}>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Right: CLIENT box */}
          <div style={{
            flex: 1, border: `1px solid ${BURGUNDY}`, borderRadius: '4px',
            overflow: 'hidden', alignSelf: 'flex-start',
          }}>
            <div style={{ backgroundColor: BURGUNDY, color: 'white', padding: '6px 12px', fontWeight: 'bold', fontSize: '11px' }}>
              CLIENT
            </div>
            <div style={{ padding: '10px 12px' }}>
              {[
                { label: 'Nom / Raison sociale :', value: invoice.clients.name },
                { label: 'Tél :', value: invoice.clients.phone || '—' },
                { label: 'Ville :', value: invoice.clients.city || '—' },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', gap: '6px', marginBottom: '5px', fontSize: '11px' }}>
                  <span style={{ fontWeight: 'bold', color: BURGUNDY }}>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ITEMS TABLE ── */}
        <div style={{ padding: '0 40px', flexShrink: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: BURGUNDY, color: 'white' }}>
                {[
                  { label: 'Qté', align: 'center', width: '50px' },
                  { label: 'Photo & Note', align: 'left', width: 'auto' },
                  { label: 'Prix U. TTC', align: 'right', width: '120px' },
                  { label: 'Total TTC', align: 'right', width: '120px' },
                ].map((h) => (
                  <th key={h.label} style={{
                    padding: '8px 12px', textAlign: h.align as any,
                    fontWeight: 'bold', fontSize: '11px', width: h.width,
                  }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_items.map((item, i) => (
                <tr key={item.id} style={{
                  borderBottom: `1px solid ${GRAY_LINE}`,
                  backgroundColor: i % 2 === 0 ? 'white' : '#fafafa',
                }}>
                  <td style={{ padding: '12px', textAlign: 'center', verticalAlign: 'middle', color: BURGUNDY, fontWeight: 'bold', fontSize: '13px' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '12px', verticalAlign: 'middle' }}>
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
                                style={{ width: '65px', height: '65px', objectFit: 'cover', borderRadius: '4px', border: `2px solid ${BURGUNDY}`, cursor: 'pointer' }}
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
                            style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${GRAY_LINE}`, flexShrink: 0 }}
                          />
                        )
                      ) : (
                        <div style={{ width: '70px', height: '70px', backgroundColor: GRAY_BG, borderRadius: '4px', border: `1px solid ${GRAY_LINE}`, flexShrink: 0 }} />
                      )}
                      {item.note && (
                        <span style={{ fontSize: '11px', color: INK, fontStyle: 'italic' }}>{item.note}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', verticalAlign: 'middle' }}>
                    {Number(item.unit_price).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    {(item.quantity * item.unit_price).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
                  </td>
                </tr>
              ))}
            </tbody>
            {/* ── Subtotal for articles if payments/solde exist ── */}
            {hasPaymentsOrSolde && (
              <tfoot>
                <tr style={{ backgroundColor: '#FAF3EE', borderTop: `2px solid ${BURGUNDY}` }}>
                  <td colSpan={3} style={{ padding: '8px 12px', fontWeight: 'bold', color: BURGUNDY, textAlign: 'right', fontSize: '11px' }}>
                    Total des articles
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: BURGUNDY, fontSize: '11px' }}>
                    {itemsTotal.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
                  </td>
                </tr>
              </tfoot>
            )}
          </table>

          {/* ── PAYMENTS & ANCIEN SOLDE TABLE (directly after articles) ── */}
          {hasPaymentsOrSolde && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: BURGUNDY, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Règlements & Solde
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: GRAY_BG }}>
                    <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 'bold', color: GRAY_TEXT, borderBottom: `1px solid ${GRAY_LINE}`, width: '22%' }}>Date</th>
                    <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 'bold', color: GRAY_TEXT, borderBottom: `1px solid ${GRAY_LINE}`, width: '30%' }}>Désignation</th>
                    <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 'bold', color: GRAY_TEXT, borderBottom: `1px solid ${GRAY_LINE}`, width: '23%' }}>Origine / Mode</th>
                    <th style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 'bold', color: GRAY_TEXT, borderBottom: `1px solid ${GRAY_LINE}`, width: '25%' }}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Case Ancien Solde */}
                  {ancienSolde > 0 && (
                    <tr style={{ borderBottom: `1px solid ${GRAY_LINE}`, backgroundColor: '#FAF3EE77' }}>
                      <td style={{ padding: '6px 12px', color: GRAY_TEXT }}>—</td>
                      <td style={{ padding: '6px 12px', color: BURGUNDY, fontWeight: 'bold' }}>
                        Ancien solde
                        {invoice.ancien_solde_note && (
                          <span style={{ fontWeight: 'normal', color: GRAY_TEXT, fontStyle: 'italic', marginLeft: '6px' }}>
                            ({invoice.ancien_solde_note})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '6px 12px', color: GRAY_TEXT }}>Reliquat précédent</td>
                      <td style={{ padding: '6px 12px', textAlign: 'right', color: BURGUNDY, fontWeight: 'bold' }}>
                        +{ancienSolde.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH
                      </td>
                    </tr>
                  )}

                  {/* Payments list */}
                  {sortedPayments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${GRAY_LINE}` }}>
                      <td style={{ padding: '6px 12px', color: INK }}>
                        {new Date(p.date).toLocaleDateString('fr-MA')}
                      </td>
                      <td style={{ padding: '6px 12px', color: INK }}>
                        {p.note || 'Paiement'}
                      </td>
                      <td style={{ padding: '6px 12px', color: INK }}>
                        {p.origine || '—'}
                      </td>
                      <td style={{ padding: '6px 12px', textAlign: 'right', color: '#2d7a4f', fontWeight: 'bold' }}>
                        -{Number(p.amount).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── FINAL TOTAL (at the very end, contains exactly what the client should pay) ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: BURGUNDY,
            color: 'white',
            padding: '10px 14px',
            marginTop: hasPaymentsOrSolde ? '12px' : '10px',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '13px',
            letterSpacing: '0.5px',
          }}>
            <span>TOTAL</span>
            <span>
              {Math.max(0, netRemaining).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH
              {netRemaining <= 0 && totalPaid > 0 && (
                <span style={{ fontSize: '10px', fontWeight: 'normal', marginLeft: '8px', opacity: 0.9 }}>
                  (Facture soldée ✓)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <div style={{ borderTop: `1px solid ${GRAY_LINE}`, padding: '14px 40px 8px' }}>
            <div style={{ fontWeight: 'bold', color: BURGUNDY, fontSize: '11px', textAlign: 'center' }}>
              COOPÉRATIVE AL MAHARA AL HIRAFIA
            </div>
          </div>
          <div style={{ backgroundColor: BURGUNDY, padding: '10px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'white', fontSize: '8.5px' }}>+212 606 662 336 · myhassan.mara68@gmail.com</span>
            {!hideConfidential && (
              <>
                <span style={{ color: 'white', fontSize: '8.5px' }}>I.C.E : 003016647000073</span>
                <span style={{ color: 'white', fontSize: '8.5px' }}>IBAN : MA 145 450 21215 4999721 0006 10</span>
              </>
            )}
          </div>
          <div style={{ backgroundColor: '#5a1d2a', padding: '5px 40px', textAlign: 'center' }}>
            <span style={{ color: 'white', fontSize: '8.5px', fontStyle: 'italic' }}>
              maharastyle.ma · Marrakech, Maroc
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}