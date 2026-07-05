const router = require('express').Router()
const pool = require('../config/db')
const { authAdmin } = require('../middlewares/auth')

router.get('/dashboard', authAdmin, async (req, res) => {
  try {
    const [o, g, s, u, p, r] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM orders WHERE DATE(created_at)=CURRENT_DATE"),
      pool.query("SELECT COALESCE(SUM(total_amount),0) as gmv FROM orders WHERE status='delivered'"),
      pool.query("SELECT COUNT(*) FROM sellers WHERE verified=TRUE"),
      pool.query("SELECT COUNT(*) FROM users"),
      pool.query("SELECT COUNT(*) FROM sellers WHERE verified=FALSE"),
      pool.query("SELECT COUNT(*) FROM orders WHERE status IN ('confirmed','accepted','dispatched')"),
    ])
    res.json({ success: true, dashboard: {
      orders_today: parseInt(o.rows[0].count), total_gmv: parseFloat(g.rows[0].gmv),
      active_sellers: parseInt(s.rows[0].count), total_users: parseInt(u.rows[0].count),
      pending_kyc: parseInt(p.rows[0].count), live_orders: parseInt(r.rows[0].count)
    }})
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/sellers', authAdmin, async (req, res) => {
  try {
    const sellers = (await pool.query('SELECT * FROM sellers ORDER BY created_at DESC')).rows
    res.json({ success: true, sellers })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/sellers/:id/verify', authAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE sellers SET verified=$1 WHERE id=$2', [req.body.verified, req.params.id])
    res.json({ success: true, message: 'Seller ' + (req.body.verified ? 'approved' : 'rejected') })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/orders', authAdmin, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query
    let q = 'SELECT o.*, u.name as user_name, s.shop_name FROM orders o JOIN users u ON o.user_id=u.id JOIN sellers s ON o.seller_id=s.id'
    const p = []
    if (status) { q += ' WHERE o.status=$1'; p.push(status) }
    q += ' ORDER BY o.created_at DESC LIMIT $' + (p.length + 1); p.push(limit)
    res.json({ success: true, orders: (await pool.query(q, p)).rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/users', authAdmin, async (req, res) => {
  try {
    const users = (await pool.query('SELECT id,name,phone,city,created_at FROM users ORDER BY created_at DESC LIMIT 100')).rows
    res.json({ success: true, users })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/flags', authAdmin, async (req, res) => {
  try {
    res.json({ success: true, flags: (await pool.query('SELECT * FROM feature_flags ORDER BY flag_key')).rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/flags/:key', authAdmin, async (req, res) => {
  try {
    await pool.query('INSERT INTO feature_flags (flag_key,enabled,updated_at) VALUES ($1,$2,NOW()) ON CONFLICT (flag_key) DO UPDATE SET enabled=$2, updated_at=NOW()', [req.params.key, req.body.enabled])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/analytics', authAdmin, async (req, res) => {
  try {
    const daily = (await pool.query("SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total_amount) as revenue FROM orders WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date")).rows
    const topSellers = (await pool.query("SELECT s.shop_name, COUNT(o.id) as orders, SUM(o.total_amount) as revenue FROM sellers s LEFT JOIN orders o ON s.id=o.seller_id WHERE o.status='delivered' GROUP BY s.id ORDER BY revenue DESC LIMIT 5")).rows
    res.json({ success: true, daily, topSellers })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
