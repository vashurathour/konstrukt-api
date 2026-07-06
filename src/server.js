require('dotenv').config()
const { server } = require('./app')
const { connectRedis } = require('./config/redis')
const pool = require('./config/db')

const PORT = process.env.PORT || 8080

const start = async () => {
  try { await pool.query('SELECT 1'); console.log('✅ Database connected') }
  catch (e) { console.log('⚠️  Database not connected:', e.message, '\n   Make sure PostgreSQL is running') }
  await connectRedis()
  server.listen(PORT, () => {
    console.log('')
    console.log('  ╔═══════════════════════════════╗')
    console.log('  ║   🏗️  KONSTRUKT API v1.0.0     ║')
    console.log('  ║   http://localhost:' + PORT + '         ║')
    console.log('  ╚═══════════════════════════════╝')
    console.log('')
    console.log('  Quick test: GET http://localhost:' + PORT)
    console.log('  Dev OTP: 123456 (all phones in dev mode)')
    console.log('  Admin: POST /auth/admin/login')
    console.log('         user: admin | pass: konstrukt@admin2025')
    console.log('')
  })
}

start()
