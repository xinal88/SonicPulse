import express from 'express';
import axios from 'axios';
import https from 'https';

const router = express.Router();

// Create an axios instance with SSL verification disabled
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  })
});

// Handle all routes without using path-to-regexp
router.use('/', async (req, res) => {
  let targetUrl;
  
  // Handle JS file requests
  if (req.url.includes('/npm/@clerk/clerk-js')) {
    targetUrl = `https://cdn.jsdelivr.net${req.url}`;
  } else {
    targetUrl = `https://feasible-squid-30.clerk.accounts.dev${req.url}`;
  }
  
  try {
    const response = await axiosInstance({
      method: req.method,
      url: targetUrl,
      data: req.method !== 'GET' ? req.body : undefined,
      headers: {
        ...req.headers,
        host: targetUrl.includes('jsdelivr') ? 'cdn.jsdelivr.net' : 'feasible-squid-30.clerk.accounts.dev',
      },
      responseType: req.url.endsWith('.js') ? 'text' : 'json',
    });
    
    // Set appropriate content type for JS files
    if (req.url.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    
    // Forward the response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      // Skip setting these headers to avoid CORS issues
      if (!['content-length', 'connection', 'keep-alive', 'content-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    
    // Ensure CORS headers are set
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5174');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).send('Proxy error');
  }
});

export default router;

