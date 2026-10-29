const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Log ENV on startup
console.log("ENV CHECK:", {
  SHORTCODE: process.env.SHORTCODE,
  TILL: process.env.TILL,
  HAS_KEY: !!process.env.CONSUMER_KEY,
  HAS_SECRET: !!process.env.CONSUMER_SECRET,
  HAS_PASSKEY: !!process.env.PASSKEY,
  PASSKEY_LEN: process.env.PASSKEY ? process.env.PASSKEY.length : 0
});

app.get('/', (req, res) => {
  res.send(`Till ${process.env.TILL} LIVE - ENV: KEY=${!!process.env.CONSUMER_KEY} SECRET=${!!process.env.CONSUMER_SECRET} PASSKEY=${!!process.env.PASSKEY}`);
});

// Get Daraja Token
async function getAccessToken() {
  const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
  const url = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
  const response = await axios.get(url, {
    headers: { Authorization: `Basic ${auth}` }
  });
  return response.data.access_token;
}

// STK PUSH - FOR TILL 8794672
app.post('/stkpush', async (req, res) => {
  const { phone, amount } = req.body;
  console.log("STK Request:", { phone, amount, odds: req.body.odds });

  try {
    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${process.env.SHORTCODE}${process.env.PASSKEY}${timestamp}`).toString('base64');

    const stkData = {
      BusinessShortCode: process.env.SHORTCODE, // 6515784
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: Number(amount),
      PartyA: phone,
      PartyB: process.env.TILL, // 8794672
      PhoneNumber: phone,
      CallBackURL: "https://sportsextra-backend-1.onrender.com/callback",
      AccountReference: "SportsExtra",
      TransactionDesc: "Bet Payment"
    };

    console.log("Sending to Safaricom:", { 
      BusinessShortCode: stkData.BusinessShortCode,
      PartyB: stkData.PartyB,
      Amount: stkData.Amount,
      Phone: stkData.PhoneNumber,
      Timestamp: timestamp
    });

    const response = await axios.post(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processquery',
      stkData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("SAFARICOM SUCCESS:", response.data);
    res.json(response.data);

  } catch (error) {
    // THIS IS THE IMPORTANT FIX - SHOWS REAL ERROR
    console.log("SAFARICOM REAL ERROR:", error.response?.data || error.message);
    console.log("SAFARICOM STATUS:", error.response?.status);
    console.log("FULL ERROR JSON:", JSON.stringify(error.response?.data));
    
    res.status(400).json({
      error: error.response?.data || error.message,
      status: error.response?.status
    });
  }
});

app.post('/callback', (req, res) => {
  console.log("CALLBACK RECEIVED:", JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: "Success" });
});

app.listen(PORT, () => {
  console.log(`LIVE Till ${process.env.TILL} on ${PORT}`);
  console.log(`==> Your service is live`);
  console.log(`==> Available at your primary URL https://sportsextra-backend-1.onrender.com`);
});
