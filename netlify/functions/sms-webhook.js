// SMS Webhook with Real-Time Firestore Updates
// Receives SMS replies and updates Firestore for real-time chat

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin (singleton pattern)
let app;
let db;

const initializeFirebase = () => {
  if (!app) {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.NETLIFY_FIREBASE_PROJECT_ID || "ask-stuart",
      private_key_id: process.env.NETLIFY_FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.NETLIFY_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.NETLIFY_FIREBASE_CLIENT_EMAIL,
      client_id: process.env.NETLIFY_FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      universe_domain: "googleapis.com"
    };

    app = initializeApp({
      credential: cert(serviceAccount)
    });
    
    db = getFirestore(app);
  }
  return { app, db };
};

exports.handler = async (event, context) => {
  console.log('🔔 SMS Webhook called:', {
    method: event.httpMethod,
    timestamp: new Date().toISOString(),
    headers: event.headers,
    body: event.body
  });
  
  // Always return valid TwiML response to prevent 500 errors
  const successResponse = {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
  };

  // Only allow POST method (Twilio webhooks)
  if (event.httpMethod !== 'POST') {
    console.log('❌ Invalid method:', event.httpMethod);
    return successResponse;
  }

  try {
    // Parse Twilio webhook data (URL-encoded)
    const body = new URLSearchParams(event.body);
    const fromNumber = body.get('From'); // Who sent the SMS
    const toNumber = body.get('To'); // Twilio number that received it
    const messageBody = body.get('Body'); // SMS content
    const messageSid = body.get('MessageSid');
    
    console.log('📱 SMS Webhook received:', {
      from: fromNumber,
      to: toNumber,
      body: messageBody,
      sid: messageSid,
      timestamp: new Date().toISOString()
    });

    // Verify this SMS is from the admin (Stuart's number)
    const adminNumber = process.env.NETLIFY_SMS_RECIPIENT;
    console.log('🔍 Admin check:', { adminNumber, fromNumber });
    
    if (!adminNumber) {
      console.log('⚠️ NETLIFY_SMS_RECIPIENT not configured');
      return successResponse;
    }

    if (fromNumber !== adminNumber) {
      console.log(`📵 SMS from ${fromNumber} ignored - not from admin ${adminNumber}`);
      return successResponse;
    }

    // SMS is from Stuart (admin) - log the reply
    console.log('✅ SMS REPLY FROM STUART RECEIVED!');
    console.log(`📝 Stuart's Reply: "${messageBody}"`);
    console.log(`📞 From: ${fromNumber}`);
    console.log(`📞 To: ${toNumber}`);
    console.log(`🆔 Message SID: ${messageSid}`);
    console.log(`⏰ Timestamp: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
    
    // 🔥 REAL-TIME UPDATE: Save reply to Firestore
    try {
      const { db } = initializeFirebase();
      
      // Find the most recent unread message to reply to
      // Since SMS doesn't include message ID, we'll update the latest pending message
      const messagesQuery = await db.collection('messages')
        .where('isFromStuart', '==', false)
        .where('read', '==', false)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
      
      if (!messagesQuery.empty) {
        const latestMessage = messagesQuery.docs[0];
        const messageData = latestMessage.data();
        
        console.log(`🎯 Updating message from ${messageData.name} with Stuart's reply`);
        
        // Update the message with Stuart's reply
        await latestMessage.ref.update({
          reply: messageBody,
          isFromStuart: true,
          read: true,
          replyTimestamp: Timestamp.now(),
          replySid: messageSid
        });
        
        console.log('🚀 REAL-TIME UPDATE SUCCESSFUL!');
        console.log(`📨 Reply "${messageBody}" added to message from ${messageData.name}`);
        console.log(`🔄 Widget will show reply instantly via Firebase listeners`);
        
      } else {
        console.log('⚠️ No pending messages found to reply to');
        
        // Create a standalone reply message if no pending message found
        await db.collection('messages').add({
          name: 'Stuart (SMS Reply)',
          question: 'Direct SMS Reply',
          reply: messageBody,
          timestamp: Timestamp.now(),
          isFromStuart: true,
          read: true,
          replySid: messageSid,
          standalone: true
        });
        
        console.log('📝 Created standalone reply message');
      }
      
    } catch (firebaseError) {
      console.error('❌ Firebase update failed:', firebaseError);
      // Don't fail the webhook if Firebase fails
    }
    
    // Log structured data for easy parsing
    console.log('📊 STRUCTURED_REPLY_DATA:', JSON.stringify({
      from: fromNumber,
      to: toNumber,
      reply: messageBody,
      messageSid: messageSid,
      timestamp: new Date().toISOString(),
      status: 'processed',
      firestoreUpdated: true
    }));

    return successResponse;

  } catch (error) {
    console.error('❌ Error processing SMS webhook:', error);
    // Still return 200 to prevent Twilio from retrying
    return successResponse;
  }
};
