// Fix: dotenv is optional on Render
try { require('dotenv').config(); } catch(e) { console.log("No dotenv - using Render ENV"); }

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const PASSKEY = process.env.PASSKEY;
const SHORTCODE = process.env.SHORTCODE || "6515784";
const TILL = process.env.TILL || "8794672";

console.log("ENV CHECK:", {
  HAS_KEY: !!CONSUMER_KEY,
  HAS_SECRET: !!CONSUMER_SECRET,
  PASSKEY_LEN: PASSKEY ? PASSKEY.length : 0,
  SHORTCODE,
  TILL
});

// Get Token
async function getToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await axios.get('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });
  return res.data.access_token;
}

// STK Push
app.post('/api/stkpush', async (req, res) => {
  try {
    let { phone, amount } = req.body;
    console.log("STK REQUEST:", phone, amount);

    if (!phone || !amount) return res.status(400).json({ error: "Phone and amount required" });

    // Format phone 254...
    phone = phone.toString().replace(/\s/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.substring(1);
    if (phone.startsWith('+')) phone = phone.substring(1);

    const token = await getToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(SHORTCODE + PASSKEY + timestamp).toString('base64');

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: parseInt(amount),
      PartyA: phone,
      PartyB: SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: `https://sportsextra-backend-1.onrender.com/api/callback`,
      AccountReference: "SportsExtra",
      TransactionDesc: "Payment"
    };

    console.log("SAFARICOM PAYLOAD:", payload);

    const stkRes = await axios.post('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("SAFARICOM SUCCESS:", stkRes.data);
    res.json(stkRes.data);

  } catch (err) {
    console.log("SAFARICOM REAL ERROR:", err.response ? err.response.data : err.message);
    res.status(400).json({ error: err.response ? err.response.data : err.message });
  }
});

// Callback
app.post('/api/callback', (req, res) => {
  console.log("CALLBACK:", JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.get('/', (req, res) => {
  res.send("Sports Extra Backend LIVE! PASSKEY_LEN: " + (PASSKEY ? PASSKEY.length : 0));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
