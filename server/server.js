const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const twilio = require('twilio');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const DELIVERY_CHARGE = 7;

// Initialize Twilio Client
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN
    ? twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )
    : null;

// FUNCTION: TRIGGER PHONE CALL
async function triggerPhoneCall(order) {
  if (
    !twilioClient ||
    !process.env.TWILIO_PHONE_NUMBER ||
    !process.env.MY_PERSONAL_PHONE
  ) {
    console.log('Twilio credentials missing. Skipping phone call.');
    return;
  }

  const spokenMessage = `Alert! You have a new VillageMart Cash on Delivery order from ${order.customerName} in ${order.village}. Total bill amount is ${order.totalAmount} Rupees. Please dispatch the order.`;

  try {
    const call = await twilioClient.calls.create({
      twiml: `<Response><Say voice="alice">${spokenMessage}</Say></Response>`,
      to: process.env.MY_PERSONAL_PHONE,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    console.log(`Phone call triggered successfully. SID: ${call.sid}`);
  } catch (err) {
    console.error('Failed to trigger phone call:', err.message);
  }
}

// FUNCTION: SEND TELEGRAM NOTIFICATION
async function sendTelegramNotification(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('Telegram credentials missing.');
    return;
  }

  const itemsList = order.items
    .map(
      item =>
        `• ${item.name} x ${item.quantity} (₹${item.price * item.quantity})`
    )
    .join('\n');

  const message = `
📦 NEW COD ORDER #${order.orderId}

🏡 Village: ${order.village}
📍 Landmark: ${order.landmark}
👤 Customer: ${order.customerName}
📞 Phone: ${order.customerPhone}

🛒 Items:
${itemsList}

💰 Total Amount: ₹${order.totalAmount} (Cash on Delivery)
`;

  try {
    await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      }
    );

    console.log('Telegram alert sent successfully.');
  } catch (err) {
    console.error('Telegram alert failed:', err.message);
  }
}

// POST ROUTE: RECEIVE ORDER
app.post('/api/orders', async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      village,
      landmark,
      items
    } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items are required'
      });
    }

    const totalAmount =
      items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ) + DELIVERY_CHARGE;

    const orderId = Math.floor(
      1000 + Math.random() * 9000
    );

    const orderData = {
      orderId,
      customerName,
      customerPhone,
      village,
      landmark,
      items,
      totalAmount
    };

    console.log('New COD Order Received:', orderData);

    await sendTelegramNotification(orderData);
    await triggerPhoneCall(orderData);

    res.status(201).json({
      success: true,
      message: 'COD Order placed successfully',
      orderId
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
});

// HEALTH CHECK ROUTE
app.get('/', (req, res) => {
  res.send('VillageMart Backend Running');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 VillageMart Server running on port ${PORT}`);
});