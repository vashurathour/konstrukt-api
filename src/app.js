require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const http       = require('http')
const { Server } = require('socket.io')
const { initFirebase } = require('./utils/notifications')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.set('io', io)

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth',     require('./routes/auth'))
app.use('/products', require('./routes/products'))
app.use('/orders',   require('./routes/orders'))
app.use('/tracking', require('./routes/tracking'))
app.use('/sellers',  require('./routes/sellers'))
app.use('/admin',    require('./routes/admin'))
app.use('/reviews',  require('./routes/reviews'))
app.use('/payments', require('./routes/payments'))
app.use('/uploads',  require('./routes/uploads'))

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  status: '✅ Konstrukt API is running!',
  version: '1.0.0',
  env: process.env.NODE_ENV,
  time: new Date().toISOString(),
}))

// ── Socket.io — Live GPS ──────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join_order',     (orderId)        => socket.join(`order_${orderId}`))
  socket.on('driver_location',({ orderId, lat, lng }) => io.to(`order_${orderId}`).emit('location_update', { orderId, lat, lng, ts: Date.now() }))
  socket.on('order_status',  ({ orderId, status }) => io.to(`order_${orderId}`).emit('status_update', { orderId, status }))
})

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => res.status(500).json({ error: err.message }))

// Init Firebase (optional - only if configured)
initFirebase()

module.exports = { app, server }
