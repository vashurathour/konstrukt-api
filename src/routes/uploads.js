// POST /uploads/product-photo
// Accepts: multipart/form-data with field "photo"
// Returns: { url: "https://..." }
// Install: npm install multer

const router  = require('express').Router()
const { authSeller } = require('../middlewares/auth')
const { uploadToR2 } = require('../utils/storage')
const pool = require('../config/db')

let upload
try {
  const multer = require('multer')
  upload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only'))
      cb(null, true)
    },
  })
} catch (e) {
  // multer not installed yet — stub middleware
  upload = { single: () => (req, res, next) => { req.file = null; next() } }
  console.log('⚠️  multer not installed — run: npm install multer')
}

// POST /uploads/product-photo  (seller auth required)
router.post('/product-photo', authSeller, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' })
    const url = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype)
    res.json({ success: true, url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /uploads/product-photos/:id  — attach uploaded URL to a product
router.post('/product-photos/:id', authSeller, async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'url required' })
    // Verify seller owns this product
    const prod = await pool.query(
      'SELECT id FROM products WHERE id=$1 AND seller_id=$2',
      [req.params.id, req.seller.id]
    )
    if (!prod.rows.length) return res.status(403).json({ error: 'Product not found' })
    // Append to photos array (max 5)
    const result = await pool.query(
      `UPDATE products
         SET photos = CASE WHEN array_length(photos,1) >= 5
                          THEN photos
                          ELSE array_append(photos, $1)
                     END
       WHERE id=$2 AND seller_id=$3
       RETURNING photos`,
      [url, req.params.id, req.seller.id]
    )
    res.json({ success: true, photos: result.rows[0].photos })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /uploads/product-photos/:id  — remove a photo URL from a product
router.delete('/product-photos/:id', authSeller, async (req, res) => {
  try {
    const { url } = req.body
    const result = await pool.query(
      `UPDATE products SET photos = array_remove(photos, $1)
       WHERE id=$2 AND seller_id=$3 RETURNING photos`,
      [url, req.params.id, req.seller.id]
    )
    res.json({ success: true, photos: result.rows[0]?.photos || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
