// Simplified messages-get function - No database, returns empty array
// This function exists to prevent 404 errors but doesn't store/retrieve messages

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

exports.handler = async (event, context) => {
  // Handle preflight CORS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow GET method
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Return empty messages array since we're not using database
  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      messages: [],
      note: 'Database disabled - only SMS notifications active'
    })
  };
};
