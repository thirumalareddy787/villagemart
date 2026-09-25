
// ==========================================
// 1. FIREBASE SETUP & AUTHENTICATION
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDV3cJllaEtb7TzAQt6l3cS7nJTSCV0KkE",
  authDomain: "villagemart-3cfe7.firebaseapp.com",
  projectId: "villagemart-3cfe7",
  storageBucket: "villagemart-3cfe7.firebasestorage.app",
  messagingSenderId: "370983618548",
  appId: "1:370983618548:web:c769ba85b9f7d318209ba1",
  measurementId: "G-6SN5H11M38"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let confirmationResult;

window.loginWithGoogle = async function() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Save details to localStorage
    localStorage.setItem('userPhone', user.phoneNumber || user.email);
    localStorage.setItem('userName', user.displayName || 'Google User');

    window.closeModal();
    alert(`Welcome ${user.displayName || 'User'}! Logged in with Google.`);
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    alert('Google Sign-In failed: ' + error.message);
  }
};

// DOM Content Loaded Handler
window.addEventListener('DOMContentLoaded', () => {
  // Initialize Recaptcha
  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    'size': 'invisible'
  });

  // Check login status
  if (localStorage.getItem('userPhone')) {
    window.closeModal();
  } else {
    window.openModal();
  }

  window.renderCategories();
  window.loadLocation();
  // Render initial UI
  window.renderProducts();
  window.updateCart();
});

// Close Modal
window.closeModal = function() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.add('hidden');
};

// Open Modal
window.openModal = function() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.remove('hidden');
};

// Send OTP
window.sendOTP = async function() {
  const nameInput = document.getElementById('userName');
  const phoneInput = document.getElementById('userPhone');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';

  if (!name || phone.length !== 10) {
    alert('Please enter a valid Name and 10-digit Phone Number');
    return;
  }

  const phoneNumber = "+91" + phone;

  try {
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
    alert('OTP sent to ' + phoneNumber);
    document.getElementById('phoneStep').classList.add('hidden');
    document.getElementById('otpStep').classList.remove('hidden');
  } catch (error) {
    console.error("OTP Error:", error);
    alert('Failed to send OTP: ' + error.message);
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.render().then(widgetId => grecaptcha.reset(widgetId));
    }
  }
};

// Verify OTP
window.verifyOTP = async function() {
  const code = document.getElementById('otpInput').value.trim();

  try {
    const result = await confirmationResult.confirm(code);
    const user = result.user;

    localStorage.setItem('userPhone', user.phoneNumber);
    const userNameVal = document.getElementById('userName')?.value || '';
    localStorage.setItem('userName', userNameVal);

    window.closeModal();
    alert('Login Successful!');
  } catch (error) {
    alert('Invalid OTP. Please try again.');
  }
};

// Log Out User
window.logout = function() {
  localStorage.removeItem('userPhone');
  localStorage.removeItem('userName');
  alert('Logged out successfully!');
  window.openModal();
};


// ==========================================
// 2. PRODUCT DATA & E-COMMERCE LOGIC
// ==========================================

const products = [
  { id: 1, name: "Fresh Milk / పాలు", price: 12, unit: "1 small", category: "Dairy", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdMoHaHSHR_RSovQSVGoKyiH4Jj_EGNSHQyXmGenGYHA&s=10" },
  { id: 2, name: "Country Eggs / గుడ్లు", price: 48, unit: "6 pcs", category: "Dairy", image: "https://www.shutterstock.com/image-photo/organic-chicken-eggs-paper-600w-2645439451.jpg" },
  { id: 3, name: "Fresh Tomatoes / టమాటాలు", price: 30, unit: "1 kg", category: "Vegetables", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStKhqon3DGSkvf__wfnlPE437oLCEZGwnG76f8E2Lm6A&s=10" },
  { id: 4, name: "Onions / ఉల్లిపాయలు", price: 35, unit: "1 kg", category: "Vegetables", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsfSB4oacZ6H3yMsVT36piBZyf1egtiS6EHV0gZQT5cKzPAXEUORLrTkI&s=10" },
  { id: 5, name: "Potatoes / బంగాళాదుంపలు", price: 30, unit: "1 kg", category: "Vegetables", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTDQ4Y3sC2GM5ik2qSiza8ZuFOgM8chv59WmbG7gGSz-A&s=10" },
  { id: 6, name: "santoor soaps /సంతూర్ సబ్బులు ", price: 55, unit: "1 pc", category: "Grains", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMTjx4FxaFKUnKlPGFGyI1cP5HrB5MIpbYQjlrl5kn2Q&s" },
  { id: 7, name: "Toor Dal / కందిపప్పు", price: 140, unit: "1 kg", category: "Grains", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYD1gM3ad0Drzx_loCJOUiH17I2GWdvXFc1_gtSQeHWQ&s=10" },
  { id: 8, name: "golddrop Cooking Oil / నూనె", price: 180, unit: "1 Liter", category: "Essentials", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbDP-LTghmBcTPCoOLsyBvTu7XvgRFQ7nqqFgRUijf2w&s=10" },
  { id: 9, name: "toothbrush /బ్రష్", price: 20, unit: "1 pc", category: "Essentials", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_LQg0h8e-DHsPhU4V_5Srkhx14ZTrDGIqEABABvOaaA&s=10" },
  { id: 10, name: "toothpaste/పేస్ట్", price: 99, unit: "1 Liter", category: "Essentials", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXdvdDf_OJusVMeeNFkxN4go5bvy0Sbk0-hkTBEj2k8oBKpVPqLL8e4Y8&s=10" },
  { id: 11, name: "pads / శానిటరీ ప్యాడ్స్", price: 48, unit: "1 pc", category: "Essentials", image: "https://www.starquik.com/cdn/shop/files/SQ164636_FOP_6adcaad3-d527-4f21-a8ec-9f06eb64e85c.jpg?v=1776847948" },
  { id: 12, name: "chillies/పచ్చి మిరపకాయలు ", price: 40, unit: "1 kg", category: "vegetables", image: "https://www.starquik.com/cdn/shop/files/1008708_9ceccf68-3684-4ea9-811a-a107746c2d26.jpg?v=1779260010" }
];

const categories = ['All', ...new Set(products.map(product => product.category))];

let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
const DELIVERY_CHARGE = 7;

window.renderCategories = function() {
  const container = document.getElementById('categoryContainer');
  if (!container) return;

  container.innerHTML = categories.map(category => `
    <button onclick="filterCategory('${category}')" class="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap hover:border-emerald-600 hover:text-emerald-700 transition">
      ${category === 'All' ? 'అన్ని (All)' : category}
    </button>
  `).join('');
};

// Render Products Grid
window.renderProducts = function(filterCategory = 'All') {
  const productGrid = document.getElementById('productGrid');
  if (!productGrid) return;

  productGrid.innerHTML = '';

  const filtered = filterCategory === 'All' 
    ? products 
    : products.filter(p => p.category === filterCategory);

  filtered.forEach(product => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col justify-between';
    card.innerHTML = `
      <div>
        <img src="${product.image}" alt="${product.name}" class="w-full h-32 object-contain rounded-xl mb-2" loading="lazy">
        <h3 class="font-bold text-gray-800 text-sm mb-1">${product.name}</h3>
        <p class="text-xs text-gray-500 mb-2">${product.unit}</p>
      </div>
      <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
        <span class="font-extrabold text-emerald-700">₹${product.price}</span>
        <button onclick="addToCart('${product.name}', ${product.price})" class="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition">
          + Add
        </button>
      </div>
    `;
    productGrid.appendChild(card);
  });
};

// Filter Products by Category
window.filterCategory = function(category) {
  window.renderProducts(category);
};

// Add Item to Cart
window.addToCart = function(name, price) {
  const existing = cart.find(item => item.name === name);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ name, price, quantity: 1 });
  }
  window.saveCart();
  window.updateCart();
};

// Remove Item or Decrease Quantity
window.removeFromCart = function(name) {
  const itemIndex = cart.findIndex(item => item.name === name);
  if (itemIndex > -1) {
    if (cart[itemIndex].quantity > 1) {
      cart[itemIndex].quantity -= 1;
    } else {
      cart.splice(itemIndex, 1);
    }
  }
  window.saveCart();
  window.updateCart();
};

// Save Cart to Local Storage
window.saveCart = function() {
  localStorage.setItem('cartItems', JSON.stringify(cart));
};

// Update Cart UI
window.updateCart = function() {
  const cartContainer = document.getElementById('cartItemsList');
  const cartTotal = document.getElementById('modalCartTotal');
  const cartCount = document.getElementById('cartCountBadge');
  const cartTotalText = document.getElementById('cartTotalText');
  const cartBar = document.getElementById('cartBar');

  if (!cartContainer) return;

  cartContainer.innerHTML = '';
  let total = 0;
  let count = 0;

  if (cart.length === 0) {
    cartContainer.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">Your cart is empty</p>`;
  } else {
    cart.forEach(item => {
      total += item.price * item.quantity;
      count += item.quantity;

      const div = document.createElement('div');
      div.className = 'flex justify-between items-center py-2 border-b border-gray-100 text-xs';
      div.innerHTML = `
        <div>
          <p class="font-semibold text-gray-800">${item.name}</p>
          <p class="text-gray-400">₹${item.price} x ${item.quantity}</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="removeFromCart('${item.name}')" class="bg-gray-100 w-6 h-6 rounded flex items-center justify-center font-bold text-gray-600 hover:bg-gray-200">-</button>
          <span class="font-semibold">${item.quantity}</span>
          <button onclick="addToCart('${item.name}', ${item.price})" class="bg-gray-100 w-6 h-6 rounded flex items-center justify-center font-bold text-gray-600 hover:bg-gray-200">+</button>
        </div>
      `;
      cartContainer.appendChild(div);
    });
  }

  const finalTotal = cart.length > 0 ? total + DELIVERY_CHARGE : 0;
  if (cartTotal) cartTotal.innerText = `₹${finalTotal}`;
  if (cartTotalText) cartTotalText.innerText = `₹${finalTotal}`;
  if (cartCount) cartCount.innerText = count;
  if (cartBar) cartBar.classList.toggle('hidden', cart.length === 0);
};

window.openLocationModal = function() {
  document.getElementById('locationModal')?.classList.remove('hidden');
};

window.closeLocationModal = function() {
  document.getElementById('locationModal')?.classList.add('hidden');
};

window.saveLocation = function() {
  const village = document.getElementById('villageSelect')?.value || 'రాంపూర్ (Rampur)';
  const landmark = document.getElementById('landmarkInput')?.value.trim() || 'సమీపంలో';
  localStorage.setItem('village', village);
  localStorage.setItem('landmark', landmark);
  window.loadLocation();
  window.closeLocationModal();
};

window.loadLocation = function() {
  const village = localStorage.getItem('village') || 'రాంపూర్ (Rampur)';
  const landmark = localStorage.getItem('landmark') || 'సమీపంలో';
  const villageSelect = document.getElementById('villageSelect');
  const landmarkInput = document.getElementById('landmarkInput');
  if (villageSelect) villageSelect.value = village;
  if (landmarkInput) landmarkInput.value = landmark === 'సమీపంలో' ? '' : landmark;
  const selectedVillageLabel = document.getElementById('selectedVillageLabel');
  const checkoutVillageLabel = document.getElementById('checkoutVillageLabel');
  const checkoutLandmarkLabel = document.getElementById('checkoutLandmarkLabel');
  if (selectedVillageLabel) selectedVillageLabel.textContent = village;
  if (checkoutVillageLabel) checkoutVillageLabel.textContent = `గ్రామం: ${village}`;
  if (checkoutLandmarkLabel) checkoutLandmarkLabel.textContent = `ల్యాండ్‌మార్క్: ${landmark}`;
};

window.openCartModal = function() {
  window.loadLocation();
  document.getElementById('cartModal')?.classList.remove('hidden');
};

window.closeCartModal = function() {
  document.getElementById('cartModal')?.classList.add('hidden');
};

// Submit Order to Backend
window.submitOrder = async function() {
  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }

  const userPhone = localStorage.getItem('userPhone');
  if (!userPhone) {
    alert('Please login first to place an order.');
    window.openModal();
    return;
  }

  const villageSelect = document.getElementById('villageSelect');
  const landmarkInput = document.getElementById('landmarkInput');

  const village = villageSelect ? villageSelect.value : 'Default Village';
  const landmark = landmarkInput ? landmarkInput.value.trim() : '';

  const orderPayload = {
    customerName: localStorage.getItem('userName') || "Gramam User",
    customerPhone: userPhone,
    items: cart,
    totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + DELIVERY_CHARGE,
    village: village,
    landmark: landmark
  };

  try {
    const response = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();
    if (data.success) {
      alert('Order Placed Successfully! Notification sent to Telegram.');
      cart = [];
      window.saveCart();
      window.updateCart();
      window.closeCartModal();
    } else {
      alert('Failed to place order: ' + data.message);
    }
  } catch (err) {
    console.error('Order Submission Error:', err);
    alert('Could not connect to backend server! Check if node server.js is running.');
  }
};