const router = require('express').Router()
const pool = require('../config/db')
const { authSeller } = require('../middlewares/auth')

router.get('/', async (req, res) => {
  try {
    const { city, category, search, min_price, max_price, seller_id, limit = 20, offset = 0 } = req.query
    let q = 'SELECT p.*, s.shop_name, s.rating as seller_rating, s.city, s.verified, s.delivery_type, s.latitude, s.longitude FROM products p JOIN sellers s ON p.seller_id=s.id WHERE p.is_active=TRUE AND s.verified=TRUE'
    const params = []
    let i = 1
    if (city) { q += ' AND s.city ILIKE $' + i++; params.push('%' + city + '%') }
    if (category) { q += ' AND p.category=$' + i++; params.push(category) }
    if (search) { q += ' AND p.name ILIKE $' + i++; params.push('%' + search + '%') }
    if (min_price) { q += ' AND p.price_per_unit>=$' + i++; params.push(min_price) }
    if (max_price) { q += ' AND p.price_per_unit<=$' + i++; params.push(max_price) }
    if (seller_id) { q += ' AND p.seller_id=$' + i++; params.push(seller_id) }
    q += ' ORDER BY s.rating DESC, p.created_at DESC LIMIT $' + i++ + ' OFFSET $' + i++
    params.push(Number(limit), Number(offset))
    const result = await pool.query(q, params)
    res.json({ success: true, products: result.rows, count: result.rows.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/categories', (req, res) => {
  res.json({ categories: [
    { key: 'raw-material', label: 'Raw Materials', icon: 'bricks',    desc: 'Sand, Bricks, Cement' },
    { key: 'steel',        label: 'Steel & Iron',  icon: 'wrench',    desc: 'TMT Bars, Pipes' },
    { key: 'paint',        label: 'Paints',        icon: 'droplet',   desc: 'Interior, Exterior' },
    { key: 'wood',         label: 'Wood & Timber', icon: 'tree',      desc: 'Plywood, Teak' },
    { key: 'tiles',        label: 'Tiles',         icon: 'grid',      desc: 'Floor, Wall' },
    { key: 'electrical',   label: 'Electrical',    icon: 'zap',       desc: 'Wires, Switches' },
    { key: 'plumbing',     label: 'Plumbing',      icon: 'droplets',  desc: 'Pipes, Fittings' },
    { key: 'furniture',    label: 'Furniture',     icon: 'sofa',      desc: 'Sofa, Beds' },
  ]})
})

router.get('/seller/mine', authSeller, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE seller_id=$1 ORDER BY created_at DESC', [req.seller.id])
    res.json({ success: true, products: result.rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT p.*, s.shop_name, s.owner_name, s.phone as seller_phone, s.rating as seller_rating, s.city, s.address as seller_address, s.verified, s.delivery_type, s.latitude, s.longitude FROM products p JOIN sellers s ON p.seller_id=s.id WHERE p.id=$1 AND p.is_active=TRUE', [req.params.id])
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' })
    await pool.query('UPDATE products SET views=views+1 WHERE id=$1', [req.params.id])
    const history = (await pool.query('SELECT price, recorded_at FROM price_history WHERE product_id=$1 ORDER BY recorded_at DESC LIMIT 10', [req.params.id])).rows
    res.json({ success: true, product: result.rows[0], price_history: history })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/seller/add', authSeller, async (req, res) => {
  try {
    const { name, description, category, unit, price_per_unit, stock_qty, weight_kg } = req.body
    if (!name || !price_per_unit) return res.status(400).json({ error: 'Name and price required' })
    const product = (await pool.query('INSERT INTO products (seller_id,name,description,category,unit,price_per_unit,stock_qty,weight_kg) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [req.seller.id, name, description, category, unit, price_per_unit, stock_qty || 0, weight_kg || 0])).rows[0]
    await pool.query('INSERT INTO price_history (product_id, price) VALUES ($1,$2)', [product.id, price_per_unit])
    res.json({ success: true, product })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/seller/:id', authSeller, async (req, res) => {
  try {
    const { name, description, price_per_unit, stock_qty, is_active, weight_kg } = req.body
    const product = (await pool.query('UPDATE products SET name=COALESCE($1,name), description=COALESCE($2,description), price_per_unit=COALESCE($3,price_per_unit), stock_qty=COALESCE($4,stock_qty), is_active=COALESCE($5,is_active), weight_kg=COALESCE($6,weight_kg) WHERE id=$7 AND seller_id=$8 RETURNING *', [name, description, price_per_unit, stock_qty, is_active, weight_kg, req.params.id, req.seller.id])).rows[0]
    if (!product) return res.status(404).json({ error: 'Not found' })
    if (price_per_unit) await pool.query('INSERT INTO price_history (product_id, price) VALUES ($1,$2)', [req.params.id, price_per_unit])
    res.json({ success: true, product })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/seller/:id', authSeller, async (req, res) => {
  try {
    await pool.query('UPDATE products SET is_active=FALSE WHERE id=$1 AND seller_id=$2', [req.params.id, req.seller.id])
    res.json({ success: true, message: 'Product removed' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
