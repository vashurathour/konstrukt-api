require('dotenv').config()
const sendPush = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken || process.env.NODE_ENV !== 'production') {
    console.log('[DEV PUSH] ' + title + ': ' + body)
    return true
  }
  try {
    const admin = require('firebase-admin')
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      })})
    }
    await admin.messaging().send({ token: fcmToken, notification: { title, body }, data: Object.fromEntries(Object.entries(data).map(([k,v])=>[k,String(v)])) })
    return true
  } catch (e) { console.error('FCM error:', e.message); return false }
}
module.exports = { sendPush }
