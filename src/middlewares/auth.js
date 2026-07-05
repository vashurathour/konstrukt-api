const jwt = require('jsonwebtoken')
require('dotenv').config()
const verify = (token, role) => {
  if (!token) throw new Error('No token')
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  if (role && decoded.role !== role) throw new Error('Forbidden')
  return decoded
}
const authUser   = (req,res,next) => { try { req.user   = verify(req.headers.authorization?.split(' ')[1]); next() } catch(e) { res.status(401).json({error:'Unauthorized: '+e.message}) }}
const authSeller = (req,res,next) => { try { req.seller = verify(req.headers.authorization?.split(' ')[1],'seller'); next() } catch(e) { res.status(401).json({error:'Unauthorized: '+e.message}) }}
const authAdmin  = (req,res,next) => { try { req.admin  = verify(req.headers.authorization?.split(' ')[1],'admin');  next() } catch(e) { res.status(401).json({error:'Unauthorized: '+e.message}) }}
module.exports = { authUser, authSeller, authAdmin }
