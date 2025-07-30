const twilio = require('twilio');
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

// Initialize Twilio client (singleton pattern)
let twilioClient;

const initializeTwilio = () => {
  if (!twilioClient) {
    const accountSid = process.env.NETLIFY_TWILIO_ACCOUNT_SID;
    const authToken = process.env.NETLIFY_TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }
    
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
};

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const MAX_QUESTION_LENGTH = 100;

exports.handler = async (event, context) => {
  // Handle preflight CORS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { name, question, hp_field } = JSON.parse(event.body);
    
    // 🛡️ HONEYPOT SPAM PROTECTION
    if (hp_field && hp_field.trim() !== '') {
      console.log('Honeypot triggered - request ignored:', { name, hp_field });
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'Request processed',
          honeypot: true 
        })
      };
    }

    // Validate required fields
    if (!name || !question) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Name and question are required' })
      };
    }

    // Character limit validation
    if (question.length > MAX_QUESTION_LENGTH) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: `Question too long. Maximum ${MAX_QUESTION_LENGTH} characters allowed.`,
          currentLength: question.length,
          maxLength: MAX_QUESTION_LENGTH
        })
      };
    }

    // Initialize Firebase and save message
    let messageId = null;
    let firestoreStatus = 'not_configured';
    
    try {
      const { db } = initializeFirebase();
      
      const messageRef = await db.collection('messages').add({
        name,
        question,
        timestamp: Timestamp.now(),
        isFromStuart: false,
        read: false,
        questionLength: question.length
      });
      
      messageId = messageRef.id;
      firestoreStatus = 'saved';
      console.log('✅ Message saved to Firestore:', messageId);
      
    } catch (firebaseError) {
      console.error('❌ Firebase error:', firebaseError);
      firestoreStatus = 'failed';
      messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Send SMS notification
    let smsStatus = 'not_configured';
    let smsDetails = {};
    
    try {
      const twilioClient = initializeTwilio();
      const fromNumber = process.env.NETLIFY_TWILIO_PHONE_NUMBER;
      const toNumber = process.env.NETLIFY_SMS_RECIPIENT;
      
      if (!fromNumber || !toNumber) {
        console.warn('Twilio phone numbers not configured');
        smsStatus = 'numbers_not_configured';
        smsDetails = {
          error: 'Phone numbers not configured',
          fromNumber: fromNumber || 'not_set',
          toNumber: toNumber || 'not_set'
        };
      } else {
        console.log(`Attempting to send SMS from ${fromNumber} to ${toNumber}`);
        
        const truncatedQuestion = question.length > 120 ? question.substring(0, 120) + '...' : question;

        const smsBody = `🏛️ New Ask Stuart Question

From: ${name}
Question: ${truncatedQuestion}

Message ID: ${messageId}
Time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}

📱 Reply via admin panel for instant chat response`;

        const message = await twilioClient.messages.create({
          body: smsBody,
          from: fromNumber,
          to: toNumber
        });
        
        console.log(`SMS sent successfully: ${message.sid}`);
        smsStatus = 'sent';
        smsDetails = {
          messageSid: message.sid,
          from: fromNumber,
          to: toNumber
        };
      }
      
    } catch (smsError) {
      console.error('Error sending SMS:', smsError);
      smsStatus = 'failed';
      smsDetails = {
        error: smsError.message,
        code: smsError.code || 'unknown'
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        messageId: messageId,
        message: 'Question received and saved to database',
        firestoreStatus: firestoreStatus,
        smsStatus: smsStatus,
        questionLength: question.length,
        maxLength: MAX_QUESTION_LENGTH,
        debug: {
          firebaseConfigured: !!(process.env.NETLIFY_FIREBASE_PROJECT_ID && process.env.NETLIFY_FIREBASE_PRIVATE_KEY),
          twilioConfigured: !!(process.env.NETLIFY_TWILIO_ACCOUNT_SID && process.env.NETLIFY_TWILIO_AUTH_TOKEN),
          smsDetails: smsDetails
        }
      })
    };

  } catch (error) {
    console.error('Error processing message:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};
