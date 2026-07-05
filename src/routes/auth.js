const router = require('express').Router()
const jwt = require('jsonwebtoken')
const pool = require('../config/db')
const { setEx, get, del } = require('../config/redis')

router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body
    if (!phone) return res.status(400).json({ error: 'Phone required' })
    const otp = process.env.NODE_ENV === 'development' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString()
    await setEx('otp:' + phone, 300, otp)
    console.log('[OTP] ' + phone + ' = ' + otp)
    res.json({ success: true, message: 'OTP sent', ...(process.env.NODE_ENV === 'development' && { dev_otp: otp }) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp, name } = req.body
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' })
    const stored = await get('otp:' + phone)
    if (!stored || stored !== otp.toString()) return res.status(400).json({ error: 'Invalid or expired OTP' })
    await del('otp:' + phone)
    let user = (await pool.query('SELECT * FROM users WHERE phone=$1', [phone])).rows[0]
    if (!user) user = (await pool.query('INSERT INTO users (phone,name) VALUES ($1,$2) RETURNING *', [phone, name || 'User'])).rows[0]
    else if (name && name !== user.name) { await pool.query('UPDATE users SET name=$1 WHERE id=$2', [name, user.id]); user.name = name }
    const token = jwt.sign({ id: user.id, phone, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '30d' })
    res.json({ success: true, token, user: { id: user.id, name: user.name, phone: user.phone, city: user.city } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/seller/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body
    const stored = await get('otp:' + phone)
    if (!stored || stored !== otp.toString()) return res.status(400).json({ error: 'Invalid or expired OTP' })
    await del('otp:' + phone)
    const seller = (await pool.query('SELECT * FROM sellers WHERE phone=$1', [phone])).rows[0]
    if (!seller) return res.status(404).json({ error: 'Seller not registered. Contact admin to register.' })
    const token = jwt.sign({ id: seller.id, phone, role: 'seller' }, process.env.JWT_SECRET, { expiresIn: '30d' })
    res.json({ success: true, token, seller: { id: seller.id, shop_name: seller.shop_name, phone: seller.phone, verified: seller.verified } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ role: 'admin', username }, process.env.JWT_SECRET, { expiresIn: '8h' })
      return res.json({ success: true, token })
    }
    res.status(401).json({ error: 'Invalid credentials' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/me', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'No token' })
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET)
    res.json({ success: true, user: decoded })
  } catch (e) { res.status(401).json({ error: 'Invalid token' }) }
})

module.exports = router
