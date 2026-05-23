export async function generateInvoicePDF(invoiceNumber: string) {
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
  
    const element = document.getElementById('invoice-pdf-template')
    if (!element) return
  
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })
  
    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
  
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
  
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`Facture_${invoiceNumber}.pdf`)
  }