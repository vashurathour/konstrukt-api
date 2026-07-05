const router = require('express').Router()
const pool = require('../config/db')
const { authUser } = require('../middlewares/auth')

router.post('/', authUser, async (req, res) => {
  try {
    const { order_id, rating, comment } = req.body
    const order = (await pool.query("SELECT * FROM orders WHERE id=$1 AND user_id=$2 AND status='delivered'", [order_id, req.user.id])).rows[0]
    if (!order) return res.status(400).json({ error: 'Can only review delivered orders' })
    const review = (await pool.query('INSERT INTO reviews (order_id,user_id,seller_id,rating,comment) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (order_id) DO UPDATE SET rating=$4, comment=$5 RETURNING *', [order_id, req.user.id, order.seller_id, rating, comment])).rows[0]
    await pool.query('UPDATE sellers SET rating=(SELECT ROUND(AVG(rating)::numeric,2) FROM reviews WHERE seller_id=$1), total_reviews=(SELECT COUNT(*) FROM reviews WHERE seller_id=$1) WHERE id=$1', [order.seller_id])
    res.json({ success: true, review })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/seller/:id', async (req, res) => {
  try {
    const reviews = (await pool.query('SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id=u.id WHERE r.seller_id=$1 ORDER BY r.created_at DESC LIMIT 20', [req.params.id])).rows
    res.json({ success: true, reviews })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
