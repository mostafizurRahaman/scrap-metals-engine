
import admin from 'firebase-admin'
import configs from '.'
const privateKey = configs.firebase.privateKey?.replace(/\\n/g, '\n')
admin.initializeApp({
  credential: admin.cert({
    projectId: configs.firebase.projectId,
    clientEmail: configs.firebase.clientEmail,
    privateKey: privateKey,
  }),
})



export const firebaseAdmin = admin

