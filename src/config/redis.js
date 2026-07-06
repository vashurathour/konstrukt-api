

const mem = {}
const connectRedis = async () => { console.log('Redis skipped') }
const setEx = async (k, ttl, v) => { mem[k] = { v, exp: Date.now() + ttl * 1000 } }
const get = async (k) => { const e = mem[k]; if (!e || Date.now() > e.exp) { delete mem[k]; return null } return e.v }
const del = async (k) => { delete mem[k] }
module.exports = { connectRedis, setEx, get, del }
