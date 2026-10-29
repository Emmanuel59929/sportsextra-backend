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
const TILL = process.env.TILL || '8794672';

app.get('/', (req, res) => {
  res.send(`LIVE! SHORTCODE:${SHORTCODE} PASSKEY_LEN:${PASSKEY?.length} TILL:${TILL}`);
});

app.post('/api/stk-push', async (req, res) => {
  try {
    let { phone, amount } = req.body;
    phone = phone.toString().replace(/\s/g,'');
    if (phone.startsWith('0')) phone = '254' + phone.slice(1);
    if (phone.startsWith('+254')) phone = phone.slice(1);
    if (!phone.startsWith('254')) phone = '254' + phone;

    console.log('PHONE:', phone, 'AMOUNT:', amount, 'TILL:', TILL);

    // Token
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    const tokenRes = await axios.get('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    const token = tokenRes.data.access_token;
    console.log('Token OK');

    const timestamp = new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
    // IMPORTANT: For Till payment, password uses TILL not SHORTCODE!
    const password = Buffer.from(`${TILL}${PASSKEY}${timestamp}`).toString('base64');

    const stkData = {
      BusinessShortCode: TILL,  // <-- FIXED: Use TILL here, not 6515784
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: Number(amount) || 150,
      PartyA: phone,
      PartyB: TILL,
      PhoneNumber: phone,
      CallBackURL: "https://sportsextra-backend-1.onrender.com/api/callback",
      AccountReference: "SportsExtra",
      TransactionDesc: "VIP Payment"
    };

    console.log('Sending STK:', JSON.stringify(stkData, null, 2));
    const stkRes = await axios.post('https://api.safaricom.co.ke/mpesa/stkpush/v1/processquery', stkData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('STK SUCCESS:', stkRes.data);
    res.json({ success: true, data: stkRes.data });

  } catch (err) {
    const fullError = err.response ? err.response.data : { message: err.message, stack: err.stack };
    console.error('STK FAIL FULL ERROR:', JSON.stringify(fullError, null, 2));
    res.status(500).json({ success: false, error: fullError, errorString: JSON.stringify(fullError), passkey_len: PASSKEY?.length });
  }
});

app.post('/api/callback', (req, res) => {
  console.log('CALLBACK:', JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
