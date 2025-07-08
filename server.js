const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silktouch', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// ==================== GEMINI AI SETUP ====================

// Initialize Gemini AI
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Function to get available model or fallback
async function initializeGeminiModel() {
  if (!process.env.GEMINI_API_KEY) {
    console.log("⚠️ No Gemini API key found - chatbot will use fallback responses");
    return null;
  }

  try {
    // Try the latest model first
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });
    
    // Test if the model works with a simple request
    await model.generateContent("Hello");
    console.log("✅ Gemini AI initialized successfully with 1.5-flash model");
    return model;
    
  } catch (error) {
    console.log("⚠️ Gemini 1.5 Flash not available, trying alternatives...");
    
    // Try alternative model names
    const modelNames = [
      "gemini-1.5-pro",
      "gemini-pro",
      "gemini-1.0-pro"
    ];
    
    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        });
        
        await model.generateContent("Hello");
        console.log(`✅ Gemini AI initialized with ${modelName} model`);
        return model;
        
      } catch (err) {
        console.log(`❌ ${modelName} not available`);
        continue;
      }
    }
    
    console.error("🚨 No compatible Gemini model found - using fallback responses");
    return null;
  }
}

// Initialize Gemini model
let geminiModel = null;
(async () => {
  geminiModel = await initializeGeminiModel();
})();

// Silk Touch AI Assistant Context
const SILK_TOUCH_CONTEXT = `
You are a helpful AI assistant for Silk Touch, a modern e-commerce clothing website based in Dubai, UAE. 

ABOUT SILK TOUCH:
- We sell men's, women's, and kids' clothing
- Categories include: shirts, jeans, dresses, blazers, t-shirts, blouses, sweaters, jackets, polos, hoodies, formal wear
- We serve customers across the UAE (Dubai, Abu Dhabi, Sharjah, etc.)
- Currency: AED (Arab Emirates Dirham)
- Free shipping on orders over AED 200
- Standard delivery: 3-7 business days
- Express delivery: 1-2 days (additional fee)
- 30-day return policy for unworn items with tags
- Sizes available: XS, S, M, L, XL, XXL, One Size
- We accept various payment methods

YOUR ROLE:
- Help customers find products
- Answer questions about orders, shipping, returns
- Provide sizing assistance
- Recommend products based on customer preferences
- Assist with general shopping queries
- Be friendly, helpful, and professional
- Use AED for pricing when discussing costs
- Always be customer-focused and solution-oriented

GUIDELINES:
- Keep responses concise but helpful (2-3 sentences max)
- If you don't know specific product details, suggest they browse the website
- For order tracking, direct them to their account page
- For complex issues, suggest contacting customer support
- Always maintain a friendly, professional tone
- Use Middle East appropriate language and cultural sensitivity
`;

// Chatbot Response Generator
async function generateChatbotResponse(query, context = []) {
  // Try Gemini AI first
  if (geminiModel) {
    try {
      // Build conversation context
      let conversationHistory = '';
      if (context && context.length > 0) {
        conversationHistory = context.map(msg => 
          `${msg.role === 'user' ? 'Customer' : 'Assistant'}: ${msg.content}`
        ).join('\n');
      }

      // Prepare the prompt
      const prompt = `${SILK_TOUCH_CONTEXT}

${conversationHistory ? `CONVERSATION HISTORY:\n${conversationHistory}\n` : ''}

CUSTOMER QUERY: ${query}

Please provide a helpful response as Silk Touch's AI assistant:`;

      // Get response from Gemini
      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      return {
        text: response.text(),
        source: 'gemini',
        success: true
      };

    } catch (error) {
      console.error('Gemini AI Error:', error.message);
      // Fall through to fallback responses
    }
  }

  // Fallback to intelligent predefined responses
  const queryLower = query.toLowerCase();
  let responseText = '';
  let intent = 'general';

  if (queryLower.includes('hello') || queryLower.includes('hi') || queryLower.includes('hey')) {
    intent = 'greeting';
    responseText = 'Hello! Welcome to Silk Touch, your modern fashion destination in the UAE. How can I help you find the perfect outfit today?';
  } else if (queryLower.includes('order') && (queryLower.includes('track') || queryLower.includes('status'))) {
    intent = 'order_tracking';
    responseText = 'To track your order, please go to your account page and check "My Orders". You can also provide your order ID for specific tracking information.';
  } else if (queryLower.includes('size') || queryLower.includes('sizing') || queryLower.includes('fit')) {
    intent = 'sizing_help';
    responseText = 'For sizing help, check our size guide on each product page. We offer XS to XXL sizes. Customer reviews often mention fit details too. Need help with a specific item?';
  } else if (queryLower.includes('return') || queryLower.includes('refund') || queryLower.includes('exchange')) {
    intent = 'returns';
    responseText = 'We offer a 30-day return policy for unworn items with tags. You can start a return from your order history or contact our support team for assistance.';
  } else if (queryLower.includes('shipping') || queryLower.includes('delivery')) {
    intent = 'shipping';
    responseText = 'Free shipping on orders over AED 200 across the UAE! Standard delivery: 3-7 days to Dubai, Abu Dhabi, Sharjah. Express delivery (1-2 days) available for extra fee.';
  } else if (queryLower.includes('help') || queryLower.includes('support') || queryLower.includes('contact')) {
    intent = 'customer_support';
    responseText = 'I\'m here to help! Ask me about products, sizing, orders, shipping, returns, or browse our categories: Men, Women, Kids. What do you need help with?';
  } else if (queryLower.includes('recommend') || queryLower.includes('suggest') || queryLower.includes('find')) {
    intent = 'product_recommendation';
    responseText = 'I\'d love to help you find something! Browse our Men\'s, Women\'s, or Kids\' collections. Use filters for price, size, and brand. What type of clothing are you looking for?';
  } else if (queryLower.includes('price') || queryLower.includes('cost') || queryLower.includes('payment')) {
    intent = 'pricing_payment';
    responseText = 'Our prices range from AED 39 (kids items) to AED 399 (premium pieces). We accept various payment methods. Use price filters to shop within your budget!';
  } else if (queryLower.includes('trending') || queryLower.includes('popular') || queryLower.includes('new') || queryLower.includes('featured')) {
    intent = 'product_recommendation';
    responseText = 'Check our featured products! Popular items: Winter Wool Sweaters (men), Elegant Evening Dresses (women), Kids Formal Suits. Visit homepage for trending items!';
  } else if (queryLower.includes('men') || queryLower.includes('male')) {
    intent = 'product_recommendation';
    responseText = 'Our men\'s collection includes shirts, jeans, blazers, t-shirts, polos, and sweaters. Prices from AED 49-399. Popular: Classic White Shirts and Business Blazers!';
  } else if (queryLower.includes('women') || queryLower.includes('female') || queryLower.includes('ladies')) {
    intent = 'product_recommendation';
    responseText = 'Our women\'s collection features dresses, blouses, jeans, sweaters, blazers, and accessories. From AED 79-299. Trending: Evening Dresses and Summer Blouses!';
  } else if (queryLower.includes('kids') || queryLower.includes('children') || queryLower.includes('child')) {
    intent = 'product_recommendation';
    responseText = 'Kids collection: t-shirts, polos, jackets, dresses, shorts, hoodies, and formal wear. Prices AED 39-189. Popular: Colorful T-Shirts and Formal Suit Sets!';
  } else if (queryLower.includes('dress') || queryLower.includes('dresses')) {
    intent = 'product_recommendation';
    responseText = 'We have beautiful dresses! Elegant Evening Dresses (AED 299), Floral Maxi Dresses (AED 169), and Kids Playtime Dresses (AED 69). Perfect for any occasion!';
  } else if (queryLower.includes('shirt') || queryLower.includes('shirts')) {
    intent = 'product_recommendation';
    responseText = 'Great shirt selection! Classic White Shirts (AED 129), Summer Blouses (AED 89), and Kids Colorful T-Shirts (AED 39). Professional and casual options available!';
  } else if (queryLower.includes('winter') || queryLower.includes('warm') || queryLower.includes('cold')) {
    intent = 'product_recommendation';
    responseText = 'Winter essentials: Men\'s Wool Sweaters (AED 219), Women\'s Knit Sweaters (AED 149), Kids Hoodies (AED 89). Stay warm and stylish!';
  } else if (queryLower.includes('formal') || queryLower.includes('business') || queryLower.includes('office')) {
    intent = 'product_recommendation';
    responseText = 'Formal wear: Business Blazers (AED 259-399), Classic Shirts (AED 129), Professional Blazers for women, Kids Formal Suits (AED 189). Perfect for work!';
  } else if (queryLower.includes('casual') || queryLower.includes('everyday')) {
    intent = 'product_recommendation';
    responseText = 'Casual comfort: Denim Jeans (AED 179-199), Cotton T-Shirts (AED 49), Summer Blouses (AED 89), Sports Shorts (AED 45). Perfect for daily wear!';
  } else if (queryLower.includes('thank') || queryLower.includes('thanks')) {
    intent = 'gratitude';
    responseText = 'You\'re welcome! Happy to help with your Silk Touch shopping. Feel free to ask if you need anything else. Enjoy your shopping experience!';
  } else if (queryLower.includes('bye') || queryLower.includes('goodbye')) {
    intent = 'farewell';
    responseText = 'Goodbye! Thanks for visiting Silk Touch. Come back anytime for the latest fashion trends. Have a wonderful day!';
  } else {
    intent = 'general';
    responseText = 'Hello! I\'m the Silk Touch AI assistant. I can help you find products, answer questions about sizing, shipping, returns, or provide recommendations. What can I help you with today?';
  }

  return {
    text: responseText,
    source: 'fallback',
    intent: intent,
    success: true
  };
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silktouch', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  phone: String,
  address: {
    street: String,
    city: String,
    postalCode: String,
    country: String
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true, enum: ['men', 'women', 'kids'] },
  subcategory: { type: String, required: true },
  brand: String,
  sizes: [{ type: String, enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'] }],
  colors: [String],
  images: [String],
  stock: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  tags: [String],
  rating: { type: Number, default: 0 },
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: Number,
    comment: String,
    date: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    size: String,
    color: String,
    price: Number
  }],
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  shippingAddress: {
    name: String,
    street: String,
    city: String,
    postalCode: String,
    country: String,
    phone: String
  },
  paymentMethod: String,
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  orderDate: { type: Date, default: Date.now },
  estimatedDelivery: Date
});

const Order = mongoose.model('Order', orderSchema);

// Cart Schema
const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 },
    size: String,
    color: String
  }],
  updatedAt: { type: Date, default: Date.now }
});

const Cart = mongoose.model('Cart', cartSchema);

// Chatbot Schema for storing interactions
const chatbotSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  query: String,
  response: String,
  intent: String,
  timestamp: { type: Date, default: Date.now }
});

const ChatbotInteraction = mongoose.model('ChatbotInteraction', chatbotSchema);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'silktouch_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Admin Middleware
const authenticateAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// ==================== AUTH ROUTES ====================

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'silktouch_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'silktouch_secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== PRODUCT ROUTES ====================

// Get all products with advanced filtering and search
app.get('/api/products', async (req, res) => {
  try {
    const {
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      size,
      color,
      search,
      sort,
      page = 1,
      limit = 12
    } = req.query;

    // Build filter object
    let filter = {};

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (brand) filter.brand = new RegExp(brand, 'i');
    if (size) filter.sizes = { $in: [size] };
    if (color) filter.colors = { $in: [color] };

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    let sortOption = {};
    switch (sort) {
      case 'price_low':
        sortOption = { price: 1 };
        break;
      case 'price_high':
        sortOption = { price: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'rating':
        sortOption = { rating: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const products = await Product.find(filter)
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('reviews.user', 'name');

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('reviews.user', 'name');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get featured products
app.get('/api/products/featured/list', async (req, res) => {
  try {
    const products = await Product.find({ featured: true }).limit(8);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create product (Admin only)
app.post('/api/products', authenticateToken, authenticateAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const productData = req.body;
    
    // Handle uploaded images
    if (req.files) {
      productData.images = req.files.map(file => `/uploads/${file.filename}`);
    }

    const product = new Product(productData);
    await product.save();
    
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update product (Admin only)
app.put('/api/products/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete product (Admin only)
app.delete('/api/products/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== CART ROUTES ====================

// Get user cart
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    res.json(cart || { items: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add item to cart
app.post('/api/cart/add', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity = 1, size, color } = req.body;

    let cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId && item.size === size && item.color === color
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity, size, color });
    }

    cart.updatedAt = new Date();
    await cart.save();
    
    const populatedCart = await Cart.findById(cart._id).populate('items.product');
    res.json(populatedCart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update cart item
app.put('/api/cart/update', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity, size, color } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId && item.size === size && item.color === color
    );

    if (itemIndex > -1) {
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
      
      cart.updatedAt = new Date();
      await cart.save();
    }

    const populatedCart = await Cart.findById(cart._id).populate('items.product');
    res.json(populatedCart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove item from cart
app.delete('/api/cart/remove/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { size, color } = req.query;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      item => !(item.product.toString() === productId && item.size === size && item.color === color)
    );

    cart.updatedAt = new Date();
    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate('items.product');
    res.json(populatedCart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== ORDER ROUTES ====================

// Create order
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product} not found` });
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      orderItems.push({
        product: item.product,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: product.price
      });
    }

    const order = new Order({
      user: req.user.id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });

    await order.save();

    // Clear user's cart
    await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product')
      .sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single order
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id })
      .populate('items.product');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== CHATBOT ROUTES ====================

// Handle chatbot query with integrated AI
app.post('/api/chatbot/query', async (req, res) => {
  try {
    const { query, sessionId, context = [] } = req.body;
    const userId = req.headers.authorization ? req.user?.id : null;

    // Validate input
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Generate response using integrated function
    const response = await generateChatbotResponse(query, context);

    // Store interaction in database
    const interaction = new ChatbotInteraction({
      user: userId,
      sessionId: sessionId || 'anonymous_' + Date.now(),
      query,
      response: response.text,
      intent: response.intent || 'general'
    });
    await interaction.save();

    res.json({ 
      response: response.text, 
      intent: response.intent || 'general',
      sessionId: sessionId || interaction.sessionId,
      aiPowered: response.source === 'gemini',
      source: response.source
    });

  } catch (error) {
    console.error('Chatbot Error:', error);
    
    // Ultimate fallback response
    const fallbackResponse = "I'm having some technical difficulties right now. Please try browsing our website directly or contact our support team for immediate assistance.";
    
    // Log the interaction with error
    try {
      const interaction = new ChatbotInteraction({
        user: req.headers.authorization ? req.user?.id : null,
        sessionId: req.body.sessionId || 'error_' + Date.now(),
        query: req.body.query || 'Unknown query',
        response: fallbackResponse,
        intent: 'system_error'
      });
      await interaction.save();
    } catch (dbError) {
      console.error('Database logging error:', dbError);
    }

    res.json({ 
      response: fallbackResponse, 
      intent: 'system_error',
      sessionId: req.body.sessionId || 'error_' + Date.now(),
      aiPowered: false,
      source: 'error_fallback'
    });
  }
});

// Get product recommendations with AI analysis
app.post('/api/chatbot/recommendations', async (req, res) => {
  try {
    const { preferences, category, budget } = req.body;

    // Build search criteria
    let filter = {};
    
    if (category && ['men', 'women', 'kids'].includes(category)) {
      filter.category = category;
    }
    
    if (budget) {
      filter.price = { $lte: parseFloat(budget) };
    }

    // Get matching products
    const products = await Product.find(filter)
      .limit(6)
      .sort({ rating: -1, featured: -1 });

    let analysis = '';

    // Try to get AI analysis if available
    if (geminiModel && preferences) {
      try {
        const prompt = `As Silk Touch's AI assistant, analyze these products and provide personalized recommendations based on customer preferences: "${preferences}"

Available products:
${products.map(p => `- ${p.name}: ${p.description} (AED ${p.price})`).join('\n')}

Provide a brief, helpful explanation of why these products match their preferences:`;

        const result = await geminiModel.generateContent(prompt);
        analysis = result.response.text();
      } catch (error) {
        console.error('Gemini recommendation error:', error);
        // Fall through to basic analysis
      }
    }

    // Fallback analysis if AI is not available
    if (!analysis) {
      analysis = `Based on your preferences for "${preferences}", I've found ${products.length} great options for you. `;
      
      if (category) {
        analysis += `These are from our ${category}'s collection, `;
      }
      
      if (budget) {
        analysis += `all within your budget of AED ${budget}. `;
      }
      
      analysis += `The selection includes our highest-rated and featured products that offer excellent quality and style. Each item has been chosen to match what you're looking for!`;
    }

    res.json({ 
      products, 
      analysis,
      count: products.length,
      aiPowered: !!geminiModel
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ 
      message: 'Unable to generate recommendations at this time',
      products: [],
      analysis: 'Please try browsing our categories directly for great product options.',
      count: 0,
      aiPowered: false
    });
  }
});

// Get chatbot analytics (Admin only)
app.get('/api/chatbot/analytics', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const totalInteractions = await ChatbotInteraction.countDocuments();
    const intentCounts = await ChatbotInteraction.aggregate([
      { $group: { _id: '$intent', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get recent interactions
    const recentInteractions = await ChatbotInteraction.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('user', 'name email');

    res.json({ 
      totalInteractions, 
      intentCounts,
      recentInteractions,
      geminiStatus: {
        available: !!geminiModel,
        apiKeyPresent: !!process.env.GEMINI_API_KEY
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Debug endpoint to check AI status (Admin only)
app.get('/api/chatbot/debug', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const status = {
      geminiApiKey: !!process.env.GEMINI_API_KEY,
      modelInitialized: !!geminiModel,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || 'development'
    };

    if (process.env.GEMINI_API_KEY && !geminiModel) {
      status.error = "Gemini API key present but model failed to initialize";
      status.suggestion = "Check server logs for model initialization errors, or try restarting";
    } else if (!process.env.GEMINI_API_KEY) {
      status.error = "Gemini API key not found";
      status.suggestion = "Add GEMINI_API_KEY to your .env file";
    } else if (geminiModel) {
      status.message = "Gemini AI is working correctly";
      status.model = "Available and responding";
    } else {
      status.message = "Using fallback responses - Gemini not available";
      status.model = "Fallback mode active";
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Quick chatbot test endpoint
app.post('/api/chatbot/test', async (req, res) => {
  try {
    const testQuery = req.body.query || "Hello, can you help me?";
    const response = await generateChatbotResponse(testQuery);
    
    res.json({
      query: testQuery,
      response: response.text,
      source: response.source,
      aiPowered: response.source === 'gemini',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Test failed', 
      message: error.message,
      fallback: 'Basic chatbot functionality should still work'
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all orders (Admin only)
app.get('/api/admin/orders', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'name')
      .sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update order status (Admin only)
app.put('/api/admin/orders/:id/status', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get dashboard analytics (Admin only)
app.get('/api/admin/analytics', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    
    const revenueData = await Order.aggregate([
      { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const totalRevenue = revenueData[0]?.total || 0;

    // Recent orders
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ orderDate: -1 })
      .limit(5);

    // Popular products
    const popularProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' }
    ]);

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      recentOrders,
      popularProducts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users (Admin only)
app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== USER PROFILE ROUTES ====================

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      req.body,
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== SEARCH & SUGGESTIONS ROUTES ====================

// Get search suggestions
app.get('/api/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const suggestions = await Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ]
    })
    .select('name')
    .limit(5);

    const suggestionTexts = suggestions.map(product => product.name);
    res.json(suggestionTexts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get filter options
app.get('/api/filters', async (req, res) => {
  try {
    const brands = await Product.distinct('brand');
    const categories = await Product.distinct('category');
    const subcategories = await Product.distinct('subcategory');
    const colors = await Product.distinct('colors');
    const sizes = await Product.distinct('sizes');

    res.json({
      brands: brands.filter(Boolean),
      categories,
      subcategories,
      colors: colors.flat().filter(Boolean),
      sizes: sizes.flat().filter(Boolean)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Silk Touch server running on port ${PORT}`);
  console.log(`📦 MongoDB connected`);
  console.log(`🤖 AI Chatbot integrated and ready`);
  console.log(`🛒 E-commerce backend fully loaded!`);
  console.log(`\n🎯 Available endpoints:`);
  console.log(`   📱 Products: /api/products`);
  console.log(`   🛒 Cart: /api/cart/*`);
  console.log(`   👤 Auth: /api/auth/*`);
  console.log(`   💬 Chatbot: /api/chatbot/*`);
  console.log(`   🔧 Admin: /api/admin/*`);
  console.log(`\n💡 Chatbot status: ${geminiModel ? '✅ Gemini AI active' : '⚠️ Fallback mode (smart responses still work)'}`);
});

module.exports = app;