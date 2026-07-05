// Push notifications via Firebase Admin SDK
// Install when ready: npm install firebase-admin

const initFirebase = () => {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('⚠️  Firebase: set FIREBASE_SERVICE_ACCOUNT in .env to enable push')
      return
    }
    const admin = require('firebase-admin')
    if (admin.apps.length) return  // already init
    const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString())
    admin.initializeApp({ credential: admin.credential.cert(sa) })
    console.log('✅ Firebase Admin ready')
    global._firebaseAdmin = admin
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') console.log('⚠️  Firebase:', e.message)
  }
}

const sendPush = async (fcmToken, title, body, data = {}) => {
  if (!global._firebaseAdmin || !fcmToken) return false
  try {
    await global._firebaseAdmin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data,
      android: { priority: 'high', notification: { sound: 'default', channelId: 'konstrukt_orders' } },
    })
    return true
  } catch { return false }
}

const ORDER_NOTIFICATIONS = {
  confirmed:  (id) => ({ title: '✅ Order Confirmed!',   body: `Order #${id} confirmed.` }),
  accepted:   (id) => ({ title: '📦 Seller Accepted!',   body: `Order #${id} being prepared.` }),
  dispatched: (id) => ({ title: '🚛 Out for Delivery!',  body: `Order #${id} on the way!` }),
  delivered:  (id) => ({ title: '✅ Delivered!',         body: `Order #${id} delivered.` }),
  new_order:  (id) => ({ title: '🔔 New Order!',         body: `New order #${id} received!` }),
}

module.exports = { initFirebase, sendPush, ORDER_NOTIFICATIONS }
