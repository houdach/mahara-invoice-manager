'use client'

import { MAHARA_LOGO } from '@/lib/logo'

type InvoiceItem = {
  id: string
  photo_base64: string | null
  quantity: number
  unit_price: number
}

type Client = {
  name: string
  phone?: string
  city?: string
}

type Props = {
  invoice: {
    number: string
    date: string
    validity: string
    total: number
    total_paid: number
    remaining: number
    clients: Client
    invoice_items: InvoiceItem[]
  }
}

// ── Minimal print-friendly palette ──
// Only burgundy stays (the brand). Everything else is grayscale so it
// prints cleanly on any printer and looks professional in both digital and print.
const BURGUNDY = '#702434'
const INK = '#1a1a1a'
const GRAY_LINE = '#dcdcdc'
const GRAY_BG = '#f4f4f4'
const GRAY_TEXT = '#555555'

export function InvoicePDFTemplate({ invoice }: Props) {
  return (
    <div
      id="invoice-pdf-template"
      style={{
        width: '794px',
        minHeight: '1123px',
        backgroundColor: 'white',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '12px',
        color: INK,
        position: 'relative',
      }}
    >
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '28px 40px 20px',
        borderBottom: `3px solid ${BURGUNDY}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Real embedded logo */}
          <img
            src={MAHARA_LOGO}
            style={{ width: '76px', height: '76px', objectFit: 'contain', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: '21px', fontWeight: 'bold', color: BURGUNDY, letterSpacing: '0.5px' }}>
              MAHARA STYLE
            </div>
            <div style={{ fontSize: '10px', color: GRAY_TEXT, marginTop: '3px', letterSpacing: '0.3px' }}>
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
      <div style={{ display: 'flex', gap: '24px', padding: '24px 40px' }}>
        {/* Left: invoice details */}
        <div style={{ flex: 1 }}>
          {[
            { label: 'N° :', value: invoice.number },
            { label: 'Date :', value: new Date(invoice.date).toLocaleDateString('fr-MA') },
            { label: 'Lieu :', value: `Marrakech, le ${new Date(invoice.date).toLocaleDateString('fr-MA')}` },
            { label: "Valable jusqu'au :", value: new Date(invoice.validity).toLocaleDateString('fr-MA') },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', gap: '8px', marginBottom: '7px', fontSize: '11px' }}>
              <span style={{ fontWeight: 'bold', color: BURGUNDY, minWidth: '120px' }}>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Right: client box */}
        <div style={{
          flex: 1, border: `1px solid ${BURGUNDY}`, borderRadius: '4px',
          overflow: 'hidden', alignSelf: 'flex-start',
        }}>
          <div style={{
            backgroundColor: BURGUNDY, color: 'white',
            padding: '6px 12px', fontWeight: 'bold', fontSize: '11px',
          }}>
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
      <div style={{ padding: '0 40px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: BURGUNDY, color: 'white' }}>
              {[
                { label: 'Qté', align: 'center', width: '55px' },
                { label: 'Photo', align: 'left', width: 'auto' },
                { label: 'Prix U. TTC', align: 'right', width: '130px' },
                { label: 'Total TTC', align: 'right', width: '130px' },
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
            {invoice.invoice_items.map((item) => (
              <tr key={item.id} style={{ borderBottom: `1px solid ${GRAY_LINE}` }}>
                <td style={{ padding: '12px', textAlign: 'center', verticalAlign: 'middle', color: BURGUNDY, fontWeight: 'bold', fontSize: '13px' }}>
                  {item.quantity}
                </td>
                <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                  {item.photo_base64 ? (
                    <img
                      src={item.photo_base64}
                      style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${GRAY_LINE}`, display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: '70px', height: '70px', backgroundColor: GRAY_BG,
                      borderRadius: '4px', border: `1px solid ${GRAY_LINE}`,
                    }} />
                  )}
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
        </table>

        {/* ── TOTALS (minimal grayscale) ── */}

        {/* Montant T.T.C — burgundy, the main figure */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: BURGUNDY, color: 'white',
          padding: '10px 12px', marginTop: '10px', fontWeight: 'bold', fontSize: '12px',
        }}>
          <span>Montant T.T.C</span>
          <span>{Number(invoice.total).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</span>
        </div>

        {/* Montant payé — only if paid, grayscale */}
        {invoice.total_paid > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: GRAY_BG, color: INK,
            padding: '9px 12px', marginTop: '3px', fontWeight: 'bold', fontSize: '12px',
            border: `1px solid ${GRAY_LINE}`,
          }}>
            <span>Montant payé</span>
            <span>{Number(invoice.total_paid).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</span>
          </div>
        )}

        {/* Reste à payer — only if not fully paid, outlined */}
        {invoice.remaining > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: 'white', color: BURGUNDY,
            padding: '9px 12px', marginTop: '3px', fontWeight: 'bold', fontSize: '12px',
            border: `1.5px solid ${BURGUNDY}`,
          }}>
            <span>Reste à payer</span>
            <span>{Number(invoice.remaining).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</span>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0' }}>
        <div style={{ borderTop: `1px solid ${GRAY_LINE}`, padding: '14px 40px 8px' }}>
          <div style={{ fontWeight: 'bold', color: BURGUNDY, fontSize: '11px', textAlign: 'center' }}>
            COOPÉRATIVE AL MAHARA AL HIRAFIA
          </div>
        </div>
        <div style={{
          backgroundColor: BURGUNDY, padding: '10px 40px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {[
            '+212 606 662 336 · myhassan.mara68@gmail.com',
            'I.C.E : 003016647000073',
            'IBAN : MA 145 450 21215 4999721 0006 10',
          ].map((text) => (
            <span key={text} style={{ color: 'white', fontSize: '8.5px' }}>{text}</span>
          ))}
        </div>
        <div style={{ backgroundColor: '#5a1d2a', padding: '5px 40px', textAlign: 'center' }}>
          <span style={{ color: 'white', fontSize: '8.5px', fontStyle: 'italic' }}>
            maharastyle.ma · Marrakech, Maroc
          </span>
        </div>
      </div>
    </div>
  )
}