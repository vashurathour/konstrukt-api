const router = require('express').Router()
const pool = require('../config/db')
const { authSeller } = require('../middlewares/auth')

router.get('/', async (req, res) => {
  try {
    const { city } = req.query
    let q = 'SELECT id,shop_name,owner_name,city,address,rating,total_reviews,delivery_type,latitude,longitude,verified FROM sellers WHERE verified=TRUE'
    const p = []
    if (city) { q += ' AND city ILIKE $1'; p.push('%' + city + '%') }
    q += ' ORDER BY rating DESC'
    res.json({ success: true, sellers: (await pool.query(q, p)).rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/dashboard', authSeller, async (req, res) => {
  try {
    const [t, p, r, a] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM orders WHERE seller_id=$1 AND DATE(created_at)=CURRENT_DATE", [req.seller.id]),
      pool.query("SELECT COUNT(*) FROM orders WHERE seller_id=$1 AND status IN ('confirmed','accepted')", [req.seller.id]),
      pool.query("SELECT COALESCE(SUM(seller_amount),0) as rev FROM orders WHERE seller_id=$1 AND status='delivered'", [req.seller.id]),
      pool.query("SELECT COUNT(*) FROM products WHERE seller_id=$1 AND is_active=TRUE", [req.seller.id]),
    ])
    res.json({ success: true, stats: { orders_today: parseInt(t.rows[0].count), pending: parseInt(p.rows[0].count), revenue: parseFloat(r.rows[0].rev), products: parseInt(a.rows[0].count) } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/profile', authSeller, async (req, res) => {
  try {
    const seller = (await pool.query('SELECT * FROM sellers WHERE id=$1', [req.seller.id])).rows[0]
    res.json({ success: true, seller })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/profile', authSeller, async (req, res) => {
  try {
    const { shop_name, owner_name, address, city, fcm_token, bank_account, bank_ifsc } = req.body
    const seller = (await pool.query('UPDATE sellers SET shop_name=COALESCE($1,shop_name), owner_name=COALESCE($2,owner_name), address=COALESCE($3,address), city=COALESCE($4,city), fcm_token=COALESCE($5,fcm_token), bank_account=COALESCE($6,bank_account), bank_ifsc=COALESCE($7,bank_ifsc) WHERE id=$8 RETURNING *', [shop_name, owner_name, address, city, fcm_token, bank_account, bank_ifsc, req.seller.id])).rows[0]
    res.json({ success: true, seller })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/register', async (req, res) => {
  try {
    const { shop_name, owner_name, phone, city, address, gst_no } = req.body
    if (!shop_name || !phone) return res.status(400).json({ error: 'Shop name and phone required' })
    const exists = (await pool.query('SELECT id FROM sellers WHERE phone=$1', [phone])).rows[0]
    if (exists) return res.status(400).json({ error: 'Phone already registered' })
    const seller = (await pool.query('INSERT INTO sellers (shop_name,owner_name,phone,city,address,gst_no,verified) VALUES ($1,$2,$3,$4,$5,$6,FALSE) RETURNING *', [shop_name, owner_name, phone, city, address, gst_no])).rows[0]
    res.json({ success: true, seller, message: 'Registration submitted. Admin will verify within 24 hours.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
