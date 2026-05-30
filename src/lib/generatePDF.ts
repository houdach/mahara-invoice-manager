export async function generateInvoicePDF(invoiceNumber: string) {
  const { default: jsPDF } = await import('jspdf')
  const { default: html2canvas } = await import('html2canvas')

  const element = document.getElementById('invoice-pdf-template')
  if (!element) return

  // Wait for all images (logo + product photos) to finish loading
  const images = element.querySelectorAll('img')
  await Promise.all(
    Array.from(images).map((img) => {
      return new Promise<void>((resolve) => {
        if (img.complete && img.naturalHeight !== 0) { resolve(); return }
        img.onload = () => resolve()
        img.onerror = () => resolve()
      })
    })
  )

  // Small delay to ensure everything is painted
  await new Promise((r) => setTimeout(r, 100))

  const canvas = await html2canvas(element, {
    scale: 3,              // higher scale = sharper output (was 2)
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 0,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    onclone: (clonedDoc) => {
      const clonedImages = clonedDoc.querySelectorAll('#invoice-pdf-template img')
      const originalImages = element.querySelectorAll('img')
      clonedImages.forEach((clonedImg, i) => {
        if (originalImages[i]) {
          (clonedImg as HTMLImageElement).src = (originalImages[i] as HTMLImageElement).src
        }
      })
    },
  })

  // Use PNG instead of JPEG — lossless, much sharper for text + logo
  const imgData = canvas.toDataURL('image/png')

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
  pdf.save(`Facture_${invoiceNumber}.pdf`)
}