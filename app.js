const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const PASSKEY = process.env.PASSKEY;
const SHORTCODE = process.env.SHORTCODE || '6515784';
const TILL = process.env.TILL || '6515784';

app.get('/', (req, res) => {
  res.send(`Sports Extra Backend LIVE! SHORTCODE: ${SHORTCODE} PASSKEY_LEN: ${PASSKEY ? PASSKEY.length : 0} TILL: ${TILL}`);
});

app.post('/api/stk-push', async (req, res) => {
  try {
    let { phone, amount } = req.body;
    console.log('STK REQUEST:', phone, amount);
    
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    phone = phone.replace(/\s/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.substring(1);
    if (!phone.startsWith('254')) phone = '254' + phone;

    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    console.log('Getting token...');
    
    const tokenRes = await axios.get('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    const access_token = tokenRes.data.access_token;
    console.log('Token OK');

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

    const stkData = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: amount || 1,
      PartyA: phone,
      PartyB: TILL,
      PhoneNumber: phone,
      CallBackURL: "https://sportsextra-backend-1.onrender.com/api/callback",
      AccountReference: "SportsExtra",
      TransactionDesc: "VIP Payment"
    };

    console.log('Sending STK to', phone);
    const stkRes = await axios.post('https://api.safaricom.co.ke/mpesa/stkpush/v1/processquery', stkData, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    console.log('STK RESPONSE:', stkRes.data);
    res.json({ success: true, data: stkRes.data });

  } catch (err) {
    console.error('STK ERROR:', err.response ? err.response.data : err.message);
    res.status(500).json({ 
      success: false, 
      error: err.response ? err.response.data : err.message,
      passkey_len: PASSKEY ? PASSKEY.length : 0
    });
  }
});

app.post('/api/callback', (req, res) => {
  console.log('CALLBACK:', JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
