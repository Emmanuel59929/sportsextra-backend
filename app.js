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

console.log('ENV CHECK:', { HAS_KEY: !!CONSUMER_KEY, HAS_SECRET: !!CONSUMER_SECRET, SHORTCODE, TILL, HAS_PASSKEY: !!PASSKEY, PASSKEY_LEN: PASSKEY?.length });

app.get('/', (req,res) => {
  res.send(`Till ${TILL} LIVE - ENV: KEY=${!!CONSUMER_KEY} SECRET=${!!CONSUMER_SECRET} PASSKEY=${!!PASSKEY}`);
});

async function getToken() {
  if(!CONSUMER_KEY || !CONSUMER_SECRET) throw new Error('Missing CONSUMER_KEY or SECRET in Render env');
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const { data } = await axios.get('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });
  return data.access_token;
}

app.post('/api/stk-push', async (req,res) => {
  try {
    if(!PASSKEY) return res.status(500).json({ success: false, error: "PASSKEY missing in Render Environment - Add it!" });
    let p = String(req.body.phone).replace(/\D/g,'');
    if(p.startsWith('0')) p = '254'+p.slice(1);
    if(p.startsWith('7')) p = '254'+p;
    
    console.log('STK Request:', { phone: p, amount: req.body.amount, odds: req.body.odds });
    const token = await getToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');
    
    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: Math.round(Number(req.body.amount)),
      PartyA: p,
      PartyB: "8794672",
      PhoneNumber: p,
      CallBackURL: `https://sportsextra-backend-1.onrender.com/api/mpesa/callback`,
      AccountReference: "SPORTSEXTRA",
      TransactionDesc: `Ksh ${req.body.amount} for ${req.body.odds} Odds`
    };
    
    console.log('Sending to Safaricom:', payload);
    const { data } = await axios.post('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Safaricom Success:', data);
    res.json({ success: true, ...data });
    
  } catch (e) {
    const realError = e.response?.data || e.message;
    console.error('SAFARICOM REAL ERROR:', JSON.stringify(realError, null, 2));
    res.status(500).json({ success: false, error: realError, details: "Check Render Logs for REAL ERROR" });
  }
});

app.post('/api/mpesa/callback', (req,res) => {
  console.log('CALLBACK:', JSON.stringify(req.body, null, 2));
  res.json({ ResultCode: 0, ResultDesc: "Accepted Till 8794672" });
});

app.listen(PORT, () => console.log(`LIVE Till ${TILL} on ${PORT}`));
