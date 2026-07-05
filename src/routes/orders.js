const router = require('express').Router()
const pool = require('../config/db')
const { authUser, authSeller } = require('../middlewares/auth')
const { sendPush } = require('../utils/fcm')

router.post('/', authUser, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { items, payment_mode, delivery_address, delivery_slot, notes } = req.body
    if (!items?.length) return res.status(400).json({ error: 'No items' })
    let total = 0
    const seller_id = items[0].seller_id
    for (const item of items) {
      const p = (await client.query('SELECT * FROM products WHERE id=$1 AND is_active=TRUE', [item.product_id])).rows[0]
      if (!p) throw new Error('Product ' + item.product_id + ' not found')
      if (p.stock_qty < item.qty) throw new Error('Insufficient stock for ' + p.name)
      item.unit_price = parseFloat(p.price_per_unit)
      item.subtotal = item.unit_price * item.qty
      total += item.subtotal
    }
    const fee = parseFloat((total * 0.02).toFixed(2))
    const otp = Math.floor(1000 + Math.random() * 9000).toString()
    const order = (await client.query('INSERT INTO orders (user_id,seller_id,total_amount,platform_fee,seller_amount,payment_mode,delivery_address,delivery_slot,otp,notes,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *', [req.user.id, seller_id, total, fee, total - fee, payment_mode, delivery_address, delivery_slot, otp, notes, 'confirmed'])).rows[0]
    for (const item of items) {
      await client.query('INSERT INTO order_items (order_id,product_id,qty,unit_price,subtotal) VALUES ($1,$2,$3,$4,$5)', [order.id, item.product_id, item.qty, item.unit_price, item.subtotal])
      await client.query('UPDATE products SET stock_qty=stock_qty-$1 WHERE id=$2', [item.qty, item.product_id])
    }
    await client.query('COMMIT')
    const seller = (await pool.query('SELECT * FROM sellers WHERE id=$1', [seller_id])).rows[0]
    if (seller?.fcm_token) sendPush(seller.fcm_token, 'New Order #' + order.id, 'Rs.' + total + ' order received!', { order_id: String(order.id) })
    res.json({ success: true, order, message: 'Order placed!' })
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }) }
  finally { client.release() }
})

router.get('/user/history', authUser, async (req, res) => {
  try {
    const orders = (await pool.query('SELECT o.*, s.shop_name FROM orders o JOIN sellers s ON o.seller_id=s.id WHERE o.user_id=$1 ORDER BY o.created_at DESC', [req.user.id])).rows
    res.json({ success: true, orders })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id', authUser, async (req, res) => {
  try {
    const order = (await pool.query('SELECT o.*, s.shop_name, s.phone as seller_phone, u.name as user_name, u.phone as user_phone FROM orders o JOIN sellers s ON o.seller_id=s.id JOIN users u ON o.user_id=u.id WHERE o.id=$1 AND o.user_id=$2', [req.params.id, req.user.id])).rows[0]
    if (!order) return res.status(404).json({ error: 'Order not found' })
    const items = (await pool.query('SELECT oi.*, p.name, p.unit, p.category FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE oi.order_id=$1', [req.params.id])).rows
    const delivery = (await pool.query('SELECT * FROM deliveries WHERE order_id=$1', [req.params.id])).rows[0]
    res.json({ success: true, order: { ...order, items, delivery } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/seller/incoming', authSeller, async (req, res) => {
  try {
    const { status } = req.query
    let q = 'SELECT o.*, u.name as user_name, u.phone as user_phone FROM orders o JOIN users u ON o.user_id=u.id WHERE o.seller_id=$1'
    const p = [req.seller.id]
    if (status) { q += ' AND o.status=$2'; p.push(status) }
    q += ' ORDER BY o.created_at DESC'
    res.json({ success: true, orders: (await pool.query(q, p)).rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/seller/:id/accept', authSeller, async (req, res) => {
  try {
    const order = (await pool.query("UPDATE orders SET status='accepted', updated_at=NOW() WHERE id=$1 AND seller_id=$2 RETURNING *", [req.params.id, req.seller.id])).rows[0]
    if (!order) return res.status(404).json({ error: 'Not found' })
    const user = (await pool.query('SELECT * FROM users WHERE id=$1', [order.user_id])).rows[0]
    if (user?.fcm_token) sendPush(user.fcm_token, 'Order Accepted!', 'Your order #' + order.id + ' is being prepared', { order_id: String(order.id) })
    res.json({ success: true, order })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/seller/:id/dispatch', authSeller, async (req, res) => {
  try {
    const { driver_name, driver_phone, vehicle_type, vehicle_no } = req.body
    await pool.query("UPDATE orders SET status='dispatched', updated_at=NOW() WHERE id=$1 AND seller_id=$2", [req.params.id, req.seller.id])
    await pool.query('DELETE FROM deliveries WHERE order_id=$1', [req.params.id])
    await pool.query("INSERT INTO deliveries (order_id,driver_name,driver_phone,vehicle_type,vehicle_no,status) VALUES ($1,$2,$3,$4,$5,'on_the_way')", [req.params.id, driver_name, driver_phone, vehicle_type, vehicle_no])
    const order = (await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id])).rows[0]
    const user = (await pool.query('SELECT * FROM users WHERE id=$1', [order.user_id])).rows[0]
    if (user?.fcm_token) sendPush(user.fcm_token, 'Out for Delivery!', 'Your order #' + req.params.id + ' is on the way. Driver: ' + driver_name, { order_id: String(req.params.id) })
    res.json({ success: true, message: 'Dispatched!' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id/deliver', authSeller, async (req, res) => {
  try {
    const { otp } = req.body
    const order = (await pool.query('SELECT * FROM orders WHERE id=$1 AND seller_id=$2', [req.params.id, req.seller.id])).rows[0]
    if (!order) return res.status(404).json({ error: 'Not found' })
    if (order.otp !== otp) return res.status(400).json({ error: 'Wrong OTP' })
    await pool.query("UPDATE orders SET status='delivered', payment_status='paid', updated_at=NOW() WHERE id=$1", [req.params.id])
    await pool.query("UPDATE deliveries SET status='delivered', delivered_at=NOW() WHERE order_id=$1", [req.params.id])
    const user = (await pool.query('SELECT * FROM users WHERE id=$1', [order.user_id])).rows[0]
    if (user?.fcm_token) sendPush(user.fcm_token, 'Delivered!', 'Order #' + req.params.id + ' delivered. Please rate your experience.', { order_id: String(req.params.id) })
    res.json({ success: true, message: 'Delivered! Payment settled T+1.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
