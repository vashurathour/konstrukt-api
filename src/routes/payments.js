const router = require('express').Router()
const pool = require('../config/db')
const { authUser } = require('../middlewares/auth')
const { createRazorpayOrder, verifyWebhook } = require('../utils/payment')

// POST /payments/initiate - Create Razorpay order
router.post('/initiate', authUser, async (req, res) => {
  try {
    const { order_id } = req.body
    const order = (await pool.query('SELECT * FROM orders WHERE id=$1 AND user_id=$2', [order_id, req.user.id])).rows[0]
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const rzpOrder = await createRazorpayOrder(order.total_amount, order.id)
    res.json({ success: true, razorpay_order: rzpOrder, amount: order.total_amount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /payments/webhook - Razorpay confirms payment
router.post('/webhook', async (req, res) => {
  try {
    const sig = req.headers['x-razorpay-signature']
    if (!verifyWebhook(req.body, sig)) return res.status(400).json({ error: 'Invalid signature' })

    const { payload } = req.body
    if (payload?.payment?.entity?.status === 'captured') {
      const notes    = payload.payment.entity.notes || {}
      const orderId  = notes.konstrukt_order_id
      const ref      = payload.payment.entity.id
      if (orderId) {
        await pool.query(`UPDATE orders SET payment_status='paid', updated_at=NOW() WHERE id=$1`, [orderId])
        await pool.query(`INSERT INTO payments (order_id, method, gateway_ref, amount, status, paid_at) VALUES ($1,'upi',$2,$3,'success',NOW())
          ON CONFLICT DO NOTHING`, [orderId, ref, payload.payment.entity.amount / 100])
      }
    }
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
