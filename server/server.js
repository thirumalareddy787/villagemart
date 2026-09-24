const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const DELIVERY_CHARGE = 7;

// Initialize Twilio Client
const twilio = require('twilio');
const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// FUNCTION: TRIGGER INSTANT PHONE CALL VIA TWILIO
async function triggerPhoneCall(order) {
  if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER || !process.env.MY_PERSONAL_PHONE) {
    console.log('⚠️ Twilio credentials missing in .env - Skipping phone call.');
    return;
  }

  // Text spoken by the automated call agent
  const spokenMessage = `Alert! You have a new GramamMart Cash on Delivery order from ${order.customerName} in ${order.village}. Total bill amount is ${order.totalAmount} Rupees. Please check your system to dispatch.`;

  try {
    const call = await twilioClient.calls.create({
      twiml: `<Response><Say voice="alice">${spokenMessage}</Say></Response>`,
      to: process.env.MY_PERSONAL_PHONE,       // Your verified Indian mobile number (+91...)
      from: process.env.TWILIO_PHONE_NUMBER   // Your Twilio virtual phone number (+1...)
    });
    console.log(`📞 Phone call triggered successfully! Call SID: ${call.sid}`);
  } catch (err) {
    console.error('❌ Failed to trigger phone call:', err.message);
  }
}

// FUNCTION: SEND TELEGRAM NOTIFICATION
async function sendTelegramNotification(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') return;

  const itemsList = order.items.map(i => ` • ${i.name} x ${i.quantity} (₹${i.price * i.quantity})`).join('\n');
  const message = `
📦 *NEW COD ORDER #${order.orderId}*
---------------------------------
🏡 *Village:* ${order.village}
📍 *Landmark:* ${order.landmark}
👤 *Customer:* ${order.customerName}
📞 *Phone:* ${order.customerPhone}

🛒 *Items:*
${itemsList}

💰 *Total Amount:* ₹${order.totalAmount} (Cash on Delivery)
  `;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
    });
    console.log('✅ Telegram alert sent successfully!');
  } catch (err) {
    console.error('❌ Telegram alert failed:', err.message);
  }
}

// POST ROUTE: RECEIVE ORDER & TRIGGER NOTIFICATIONS
app.post('/api/orders', async (req, res) => {
  const { customerName, customerPhone, village, landmark, items } = req.body;
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + DELIVERY_CHARGE;
  const orderId = Math.floor(1000 + Math.random() * 9000);

  const orderData = { orderId, customerName, customerPhone, village, landmark, items, totalAmount };

  console.log('📦 New COD Order Received:', orderData);

  // Trigger notifications
  await sendTelegramNotification(orderData);
  await triggerPhoneCall(orderData);

  res.status(201).json({ success: true, message: 'COD Order placed successfully', orderId });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 GramamMart Server running on http://localhost:${PORT}`));