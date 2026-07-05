require('dotenv').config()
let client = null
const mem = {}
const connectRedis = async () => {
  try {
    const { createClient } = require('redis')
    client = createClient({ url: process.env.REDIS_URL })
    client.on('error', () => { client = null })
    await client.connect()
    console.log('✅ Redis connected')
  } catch { console.log('⚠️  Redis unavailable - using memory store'); client = null }
}
const setEx = async (k, ttl, v) => { if (client) return client.setEx(k, ttl, v); mem[k] = { v, exp: Date.now() + ttl * 1000 } }
const get = async (k) => { if (client) return client.get(k); const e = mem[k]; if (!e || Date.now() > e.exp) { delete mem[k]; return null }; return e.v }
const del = async (k) => { if (client) return client.del(k); delete mem[k] }
module.exports = { connectRedis, setEx, get, del }
