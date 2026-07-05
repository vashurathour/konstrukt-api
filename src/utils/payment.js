// Razorpay integration
// Get keys from razorpay.com dashboard

const createRazorpayOrder = async (amount, orderId) => {
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'your_razorpay_key_id') {
    // Return mock for development
    return { id: `dev_order_${orderId}`, amount: amount * 100, currency: 'INR', dev_mode: true }
  }
  try {
    const Razorpay = require('razorpay')
    const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_SECRET })
    return await rzp.orders.create({ amount: amount * 100, currency: 'INR', receipt: `order_${orderId}`, notes: { konstrukt_order_id: orderId } })
  } catch (e) {
    throw new Error('Payment gateway error: ' + e.message)
  }
}

const verifyWebhook = (body, signature) => {
  if (!process.env.RAZORPAY_SECRET) return true // skip in dev
  const crypto = require('crypto')
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET).update(JSON.stringify(body)).digest('hex')
  return expected === signature
}

module.exports = { createRazorpayOrder, verifyWebhook }
