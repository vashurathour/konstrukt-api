const generateInvoicePDF = (order, items, user, seller) => {
  return new Promise((resolve) => {
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ margin: 50 })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.fontSize(22).fillColor('#2D2B5E').text('KONSTRUKT', 50, 50)
    doc.fontSize(10).fillColor('#666').text('Construction Material Marketplace', 50, 78)
    doc.fontSize(14).fillColor('#333').text('Tax Invoice #' + order.id, 380, 50, { align: 'right' })
    doc.fontSize(10).text('Date: ' + new Date(order.created_at).toLocaleDateString('en-IN'), 380, 70, { align: 'right' })
    doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#ddd').stroke()
    doc.fontSize(10).fillColor('#333').text('Bill To:', 50, 115).text(user.name || '', 50, 130).text(order.delivery_address || '', 50, 145)
    doc.text('Sold By:', 320, 115).text(seller.shop_name, 320, 130).text(seller.address || '', 320, 145).text('GST: ' + (seller.gst_no || 'N/A'), 320, 165)
    doc.moveTo(50, 190).lineTo(545, 190).strokeColor('#ddd').stroke()
    doc.fontSize(10).fillColor('#999').text('Item', 50, 205).text('Qty', 320, 205).text('Rate', 390, 205).text('Amount', 470, 205)
    doc.moveTo(50, 220).lineTo(545, 220).strokeColor('#ddd').stroke()
    let y = 235
    items.forEach(item => {
      doc.fontSize(10).fillColor('#333')
      doc.text(item.name, 50, y).text(item.qty + ' ' + (item.unit || ''), 320, y).text('Rs.' + item.unit_price, 390, y).text('Rs.' + item.subtotal, 470, y)
      y += 22
    })
    doc.moveTo(50, y + 5).lineTo(545, y + 5).strokeColor('#ddd').stroke()
    doc.fontSize(12).fillColor('#2D2B5E').text('Total Amount: Rs.' + order.total_amount, 330, y + 15)
    doc.fontSize(9).fillColor('#999').text('Payment: ' + (order.payment_mode || '').toUpperCase(), 50, y + 15)
    doc.text('Thank you for choosing Konstrukt!', 50, y + 50)
    doc.end()
  })
}
module.exports = { generateInvoicePDF }
