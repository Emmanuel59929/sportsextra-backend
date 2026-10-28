const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = process.env.PORT || 10000;
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const SHORTCODE = process.env.SHORTCODE || '6515784';
const TILL = process.env.TILL || '8794672';
const PASSKEY = process.env.PASSKEY;

app.get('/', (req,res) => {
  res.send(`Sportsextra M-Pesa API Running Till ${TILL} - LIVE - POST /api/stk-push works!`);
});

async function getToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const { data } = await axios.get('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });
  return data.access_token;
}

app.post('/api/stk-push', async (req,res) => {
  try {
    const { phone, amount, odds } = req.body;
    let p = String(phone).replace(/\D/g,'');
    if(p.startsWith('0')) p = '254'+p.slice(1);
    if(p.startsWith('7')) p = '254'+p;
    const token = await getToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');
    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: Math.round(Number(amount)),
      PartyA: p,
      PartyB: TILL,
      PhoneNumber: p,
      CallBackURL: `https://sportsextra-backend-1.onrender.com/api/mpesa/callback`,
      AccountReference: "SPORTSEXTRA",
      TransactionDesc: `Ksh ${amount} for ${odds} Odds Till 8794672`
    };
    const { data } = await axios.post('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('STK to', p, 'Till', TILL, data);
    res.json({ success: true, ...data });
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ success: false, error: e.response?.data || e.message });
  }
});

app.post('/api/mpesa/callback', (req,res) => {
  console.log('CALLBACK Till 8794672:', JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.listen(PORT, () => console.log(`Listening on ${PORT} Till ${TILL} LIVE`));
