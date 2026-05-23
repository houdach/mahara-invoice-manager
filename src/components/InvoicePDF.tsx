'use client'

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

export function InvoicePDFTemplate({ invoice }: Props) {
  return (
    <div
      id="invoice-pdf-template"
      style={{
        width: '794px',
        minHeight: '1123px',
        backgroundColor: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#1a1a1a',
        position: 'relative',
        padding: '0',
      }}
    >
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '28px 40px 20px',
        borderBottom: '4px solid #702434',
      }}>
        {/* Logo + company info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            border: '2px solid #702434', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{ textAlign: 'center', lineHeight: 1.1 }}>
              <div style={{ fontSize: '10px', color: '#702434', fontWeight: 'bold', letterSpacing: '2px' }}>M A H A R A</div>
              <div style={{ fontSize: '18px', color: '#702434', fontWeight: 'bold' }}>M</div>
              <div style={{ fontSize: '10px', color: '#BF984D' }}>✦</div>
              <div style={{ fontSize: '18px', color: '#702434', fontWeight: 'bold' }}>S</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#702434', letterSpacing: '1px' }}>
              MAHARA STYLE
            </div>
            <div style={{ fontSize: '11px', color: '#BF984D', marginTop: '2px' }}>
              COOPÉRATIVE AL MAHARA AL HIRAFIA
            </div>
            <div style={{ fontSize: '11px', color: '#702434', marginTop: '2px' }}>
              Marrakech, Maroc
            </div>
          </div>
        </div>

        {/* FACTURE title */}
        <div style={{
          fontSize: '36px', fontWeight: 'bold',
          color: '#702434', letterSpacing: '2px',
        }}>
          FACTURE
        </div>
      </div>

      {/* ── INFO SECTION ── */}
      <div style={{
        display: 'flex', gap: '24px',
        padding: '24px 40px',
      }}>
        {/* Left: invoice details */}
        <div style={{ flex: 1 }}>
          {[
            { label: 'N° :', value: invoice.number },
            { label: 'Date :', value: new Date(invoice.date).toLocaleDateString('fr-MA') },
            { label: 'Lieu :', value: `Marrakech, le ${new Date(invoice.date).toLocaleDateString('fr-MA')}` },
            { label: "Valable jusqu'au :", value: new Date(invoice.validity).toLocaleDateString('fr-MA') },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontWeight: 'bold', color: '#702434', minWidth: '130px' }}>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Right: client box */}
        <div style={{
          flex: 1, border: '1px solid #702434',
          borderRadius: '4px', overflow: 'hidden',
        }}>
          <div style={{
            backgroundColor: '#702434', color: 'white',
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
              <div key={row.label} style={{ display: 'flex', gap: '8px', marginBottom: '5px', fontSize: '11px' }}>
                <span style={{ fontWeight: 'bold', color: '#702434' }}>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ITEMS TABLE ── */}
      <div style={{ padding: '0 40px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#702434', color: 'white' }}>
              {[
                { label: 'Qté', align: 'center', width: '60px' },
                { label: 'Photo', align: 'left', width: 'auto' },
                { label: 'Prix U. TTC', align: 'right', width: '140px' },
                { label: 'Total TTC', align: 'right', width: '140px' },
              ].map((h) => (
                <th key={h.label} style={{
                  padding: '8px 12px',
                  textAlign: h.align as any,
                  fontWeight: 'bold',
                  fontSize: '11px',
                  width: h.width,
                }}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.invoice_items.map((item, i) => (
              <tr key={item.id} style={{
                borderBottom: '1px solid #e5e5e5',
                backgroundColor: i % 2 === 0 ? 'white' : '#faf8f6',
              }}>
                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#702434', fontWeight: 'bold' }}>
                  {item.quantity}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {item.photo_base64 ? (
                    <img
                      src={item.photo_base64}
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  ) : (
                    <div style={{
                      width: '60px', height: '60px', backgroundColor: '#f5f0eb',
                      borderRadius: '4px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '20px',
                    }}>
                      📷
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  {Number(item.unit_price).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold' }}>
                  {(item.quantity * item.unit_price).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── TOTALS ── */}

        {/* Total TTC — always shown */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: '#BF984D', color: 'white',
          padding: '10px 12px', fontWeight: 'bold',
        }}>
          <span>Montant T.T.C</span>
          <span>{Number(invoice.total).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</span>
        </div>

        {/* Montant payé — only if client has paid something */}
        {invoice.total_paid > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: '#2d7a4f', color: 'white',
            padding: '8px 12px', fontWeight: 'bold',
          }}>
            <span>Montant payé</span>
            <span>{Number(invoice.total_paid).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</span>
          </div>
        )}

        {/* Reste à payer — only if not fully paid */}
        {invoice.remaining > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: '#FAF3EE', color: '#702434',
            padding: '8px 12px', fontWeight: 'bold',
            border: '1px solid #BF984D55',
          }}>
            <span>Reste à payer</span>
            <span>{Number(invoice.remaining).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</span>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        position: 'absolute', bottom: '0', left: '0', right: '0',
      }}>
        <div style={{
          borderTop: '1px solid #e5e5e5',
          padding: '16px 40px 8px',
        }}>
          <div style={{ fontWeight: 'bold', color: '#702434', fontSize: '11px', marginBottom: '4px' }}>
            COOPÉRATIVE AL MAHARA AL HIRAFIA
          </div>
        </div>
        <div style={{
          backgroundColor: '#702434',
          padding: '10px 40px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {[
            '+212 606 662 336 · myhassan.mara68@gmail.com',
            'I.C.E : 003016647000073',
            'IBAN : MA 145 450 21215 4999721 0006 10',
          ].map((text) => (
            <span key={text} style={{ color: 'white', fontSize: '9px' }}>{text}</span>
          ))}
        </div>
        <div style={{
          backgroundColor: '#BF984D',
          padding: '5px 40px',
          display: 'flex', justifyContent: 'center', gap: '16px',
        }}>
          <span style={{ color: 'white', fontSize: '9px', fontStyle: 'italic' }}>maharastyle.ma</span>
          <span style={{ color: 'white', fontSize: '9px' }}>·</span>
          <span style={{ color: 'white', fontSize: '9px', fontStyle: 'italic' }}>Marrakech, Maroc</span>
        </div>
      </div>
    </div>
  )
}