const router = require('express').Router()
const pool = require('../config/db')
const { authSeller } = require('../middlewares/auth')

router.post('/:orderId/location', authSeller, async (req, res) => {
  try {
    const { lat, lng } = req.body
    await pool.query('UPDATE deliveries SET lat=$1, lng=$2 WHERE order_id=$3', [lat, lng, req.params.orderId])
    if (req.app.get('io')) req.app.get('io').to('order_' + req.params.orderId).emit('location_update', { orderId: req.params.orderId, lat, lng, ts: new Date() })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:orderId', async (req, res) => {
  try {
    const d = (await pool.query('SELECT d.*, o.status as order_status FROM deliveries d JOIN orders o ON d.order_id=o.id WHERE d.order_id=$1', [req.params.orderId])).rows[0]
    if (!d) return res.status(404).json({ error: 'Tracking not available' })
    res.json({ success: true, delivery: d })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
