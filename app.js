const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 10000;
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const SHORTCODE = process.env.SHORTCODE || '6515784';
const TILL = process.env.TILL || '8794672';
const PASSKEY = process.env.PASSKEY;
const BUSINESS_SHORTCODE = TILL || SHORTCODE;
function getTimestamp(){const d=new Date();const pad=n=>n.toString().padStart(2,'0');return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;}
async function getAccessToken(){const auth=Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');const res=await axios.get('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',{headers:{Authorization:`Basic ${auth}`}});return res.data.access_token;}
app.get('/',(req,res)=>{res.send(`<h1>Sportsextra M-Pesa API Running Till ${TILL}</h1>`);});
app.get('/health',(req,res)=>{res.json({status:'ok',till:TILL,shortcode:SHORTCODE,has_keys:!!(CONSUMER_KEY&&CONSUMER_SECRET&&PASSKEY)});});
app.post('/stkpush',async(req,res)=>{try{let{phone,amount}=req.body;phone=phone.toString().replace(/\D/g,'');if(phone.startsWith('0'))phone='254'+phone.substring(1);if(phone.startsWith('7'))phone='254'+phone;const timestamp=getTimestamp();const password=Buffer.from(`${BUSINESS_SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');const token=await getAccessToken();const payload={BusinessShortCode:BUSINESS_SHORTCODE,Password:password,Timestamp:timestamp,TransactionType:'CustomerBuyGoodsOnline',Amount:Math.round(amount),PartyA:phone,PartyB:BUSINESS_SHORTCODE,PhoneNumber:phone,CallBackURL:`https://sportsextra-backend.onrender.com/callback`,AccountReference:`Sportsextra-${TILL}`,TransactionDesc:`Payment to Till ${TILL}`};const stkRes=await axios.post('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',payload,{headers:{Authorization:`Bearer ${token}`}});res.json({success:true,data:stkRes.data});}catch(err){res.status(500).json({success:false,error:err.response?.data||err.message});}});
app.post('/callback',(req,res)=>{console.log('Callback:',JSON.stringify(req.body));res.json({ResultCode:0,ResultDesc:'Accepted'});});
app.listen(PORT,()=>console.log(`Listening on ${PORT} Till ${TILL}`));
