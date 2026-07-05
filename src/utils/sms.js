require('dotenv').config()
const sendSMS = async (phone, message) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEV SMS] to ' + phone + ': ' + message)
    return true
  }
  try {
    const url = 'https://api.msg91.com/api/v5/otp?template_id=' + process.env.MSG91_TEMPLATE_ID + '&mobile=91' + phone + '&authkey=' + process.env.MSG91_API_KEY
    const res = await fetch(url, { method: 'POST' })
    return res.ok
  } catch (e) { console.error('SMS error:', e.message); return false }
}
module.exports = { sendSMS }
