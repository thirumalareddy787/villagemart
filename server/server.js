require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const db = require('./config/db');

const app = express();
const DELIVERY_CHARGE = 7;
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Twilio Client
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

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

// FUNCTION: SEND TELEGRAM NOTIFICATION (Uses built-in global fetch)
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
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    console.log('Telegram alert sent successfully.');
  } catch (err) {
    console.error('Telegram alert failed:', err.message);
  }
}
// Auto-ensure table exists on backend startup
async function ensureTablesExist() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(150) NOT NULL,
        customer_phone VARCHAR(30) NOT NULL,
        village VARCHAR(120) NOT NULL,
        landmark VARCHAR(255),
        items JSON NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database ready: 'orders' table verified.");
  } catch (err) {
    console.error("Error creating tables:", err);
  }
}

ensureTablesExist();

// ==========================================
// API ROUTES
// ==========================================

// HEALTH CHECK ROUTE
app.get('/', (req, res) => {
  res.send('VillageMart Backend Running');
});

// 1. Route to get all products from MySQL
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Route to toggle Out of Stock status
app.patch('/api/products/:id/stock-status', async (req, res) => {
  const { id } = req.params;
  const { is_out_of_stock } = req.body;

  try {
    await db.query(
      'UPDATE products SET is_out_of_stock = ? WHERE id = ?',
      [is_out_of_stock ? 1 : 0, id]
    );
    res.json({ success: true, message: 'Stock status updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POST ROUTE: RECEIVE ORDER
app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, customerPhone, village, landmark, items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items are required'
      });
    }

    const totalAmount =
      items.reduce((sum, item) => sum + item.price * item.quantity, 0) +
      DELIVERY_CHARGE;

    const [insertResult] = await db.execute(
      `INSERT INTO orders
        (customer_name, customer_phone, village, landmark, items, total_amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        customerName,
        customerPhone,
        village,
        landmark || null,
        JSON.stringify(items),
        totalAmount
      ]
    );

    const orderId = insertResult.insertId;

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

// ==========================================
// SERVER INITIALIZATION
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 VillageMart Server running on port ${PORT}`);
});