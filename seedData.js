const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Enhanced MongoDB Connection with better error handling
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/silktouch';
    console.log('🔌 Connecting to MongoDB:', mongoURI);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

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

// Product Schema with image field
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
  image: { type: String, required: true }, // Main product image - REQUIRED
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

// Create models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

// Sample Users Data
const usersData = [
  {
    name: 'Ahmed Admin',
    email: 'admin@silktouch.com',
    password: 'admin123',
    role: 'admin',
    phone: '+971501234567',
    address: {
      street: '123 Admin Street',
      city: 'Dubai',
      postalCode: '12345',
      country: 'UAE'
    }
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    password: 'user123',
    role: 'user',
    phone: '+971507654321',
    address: {
      street: '456 User Avenue',
      city: 'Abu Dhabi',
      postalCode: '54321',
      country: 'UAE'
    }
  },
  {
    name: 'Mohammed Al Rashid',
    email: 'mohammed@example.com',
    password: 'user123',
    role: 'user',
    phone: '+971501111111',
    address: {
      street: '789 Fashion Boulevard',
      city: 'Sharjah',
      postalCode: '11111',
      country: 'UAE'
    }
  }
];

// Enhanced Products Data with Fallback Images
const productsData = [
  // Men's Clothing
  {
    name: 'Classic White Shirt',
    description: 'Premium cotton dress shirt perfect for office or formal occasions. Comfortable fit with modern styling and excellent durability.',
    price: 129,
    category: 'men',
    subcategory: 'shirts',
    brand: 'Silk Touch Premium',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['White', 'Light Blue'],
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=600&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1564859228273-274232fdb516?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 50,
    featured: true,
    tags: ['formal', 'cotton', 'office', 'classic'],
    rating: 4.5
  },
  {
    name: 'Casual Denim Jeans',
    description: 'Comfortable straight-fit jeans made from high-quality denim. Perfect for everyday wear with excellent durability.',
    price: 199,
    category: 'men',
    subcategory: 'jeans',
    brand: 'Urban Style',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Dark Blue', 'Light Blue', 'Black'],
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 75,
    featured: true,
    tags: ['casual', 'denim', 'comfortable', 'everyday'],
    rating: 4.3
  },
  {
    name: 'Business Blazer',
    description: 'Elegant blazer for professional settings. Tailored fit with attention to detail.',
    price: 399,
    category: 'men',
    subcategory: 'blazers',
    brand: 'Executive',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Navy', 'Charcoal', 'Black'],
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 30,
    featured: false,
    tags: ['formal', 'business', 'professional', 'tailored'],
    rating: 4.7
  },
  {
    name: 'Cotton T-Shirt',
    description: 'Soft cotton t-shirt for casual wear. Available in multiple colors and sizes.',
    price: 49,
    category: 'men',
    subcategory: 'tshirts',
    brand: 'Comfort Zone',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['White', 'Black', 'Gray', 'Navy', 'Red'],
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 100,
    featured: false,
    tags: ['casual', 'cotton', 'basic', 'comfortable'],
    rating: 4.2
  },
  {
    name: 'Sports Performance Polo',
    description: 'Moisture-wicking polo shirt perfect for active lifestyle and sports activities.',
    price: 89,
    category: 'men',
    subcategory: 'polos',
    brand: 'Active Wear',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['White', 'Navy', 'Red', 'Gray'],
    image: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 65,
    featured: false,
    tags: ['sports', 'active', 'moisture-wicking', 'polo'],
    rating: 4.4
  },
  {
    name: 'Winter Wool Sweater',
    description: 'Premium wool sweater for cold weather. Classic V-neck design with superior warmth.',
    price: 219,
    category: 'men',
    subcategory: 'sweaters',
    brand: 'Winter Collection',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Navy', 'Gray', 'Burgundy', 'Black'],
    image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 35,
    featured: true,
    tags: ['winter', 'wool', 'warm', 'classic'],
    rating: 4.6
  },

  // Women's Clothing
  {
    name: 'Elegant Evening Dress',
    description: 'Stunning evening dress perfect for special occasions. Flattering silhouette with premium fabric.',
    price: 299,
    category: 'women',
    subcategory: 'dresses',
    brand: 'Glamour',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Black', 'Navy', 'Burgundy'],
    image: 'https://images.unsplash.com/photo-1566479179817-fb77d2a4b8c9?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1566479179817-fb77d2a4b8c9?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 25,
    featured: true,
    tags: ['formal', 'evening', 'elegant', 'special occasion'],
    rating: 4.8
  },
  {
    name: 'Casual Summer Blouse',
    description: 'Light and airy blouse perfect for summer days. Comfortable and stylish for everyday wear.',
    price: 89,
    category: 'women',
    subcategory: 'blouses',
    brand: 'Summer Breeze',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['White', 'Pink', 'Yellow', 'Light Blue'],
    image: 'https://images.unsplash.com/photo-1485462537415-ac24221ce21d?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1485462537415-ac24221ce21d?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 60,
    featured: true,
    tags: ['casual', 'summer', 'lightweight', 'comfortable'],
    rating: 4.4
  },
  {
    name: 'High-Waisted Jeans',
    description: 'Trendy high-waisted jeans with a flattering fit. Made from stretch denim for comfort.',
    price: 179,
    category: 'women',
    subcategory: 'jeans',
    brand: 'Trendy Fit',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Dark Blue', 'Light Blue', 'Black'],
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 80,
    featured: false,
    tags: ['trendy', 'high-waisted', 'stretch', 'denim'],
    rating: 4.6
  },
  {
    name: 'Floral Maxi Dress',
    description: 'Beautiful floral print maxi dress perfect for summer occasions and casual events.',
    price: 169,
    category: 'women',
    subcategory: 'dresses',
    brand: 'Floral Dreams',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Blue Floral', 'Pink Floral', 'White Floral'],
    image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 35,
    featured: true,
    tags: ['floral', 'maxi', 'summer', 'casual'],
    rating: 4.5
  },
  {
    name: 'Knit Sweater',
    description: 'Cozy knit sweater perfect for cooler weather. Soft and warm with a classic design.',
    price: 149,
    category: 'women',
    subcategory: 'sweaters',
    brand: 'Cozy Knits',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Beige', 'Gray', 'Pink', 'Navy'],
    image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 45,
    featured: false,
    tags: ['cozy', 'knit', 'warm', 'classic'],
    rating: 4.3
  },
  {
    name: 'Professional Blazer',
    description: 'Sophisticated blazer designed for the modern professional woman. Perfect for office wear.',
    price: 259,
    category: 'women',
    subcategory: 'blazers',
    brand: 'Career Woman',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black', 'Navy', 'Gray', 'Burgundy'],
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 40,
    featured: false,
    tags: ['professional', 'office', 'formal', 'sophisticated'],
    rating: 4.7
  },
  {
    name: 'Silk Scarf Collection',
    description: 'Premium silk scarves in various designs. Perfect accessory for any outfit.',
    price: 79,
    category: 'women',
    subcategory: 'accessories',
    brand: 'Silk Elegance',
    sizes: ['One Size'],
    colors: ['Floral Print', 'Abstract Print', 'Solid Navy', 'Solid Red'],
    image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 50,
    featured: false,
    tags: ['silk', 'accessory', 'elegant', 'versatile'],
    rating: 4.2
  },

  // Kids' Clothing
  {
    name: 'Kids Colorful T-Shirt',
    description: 'Fun and colorful t-shirt for active kids. Made from soft, breathable cotton.',
    price: 39,
    category: 'kids',
    subcategory: 'tshirts',
    brand: 'Little Ones',
    sizes: ['S', 'M', 'L'],
    colors: ['Rainbow', 'Blue', 'Pink', 'Green'],
    image: 'https://images.unsplash.com/photo-1519578922761-228e1b73de71?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1519578922761-228e1b73de71?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 90,
    featured: true,
    tags: ['kids', 'colorful', 'cotton', 'playful'],
    rating: 4.5
  },
  {
    name: 'School Uniform Polo',
    description: 'Classic polo shirt suitable for school uniforms. Durable and comfortable for daily wear.',
    price: 59,
    category: 'kids',
    subcategory: 'polos',
    brand: 'School Style',
    sizes: ['S', 'M', 'L'],
    colors: ['Navy', 'White', 'Light Blue'],
    image: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 70,
    featured: false,
    tags: ['school', 'uniform', 'polo', 'durable'],
    rating: 4.1
  },
  {
    name: 'Kids Denim Jacket',
    description: 'Stylish denim jacket for kids. Perfect layering piece for any outfit.',
    price: 99,
    category: 'kids',
    subcategory: 'jackets',
    brand: 'Junior Fashion',
    sizes: ['S', 'M', 'L'],
    colors: ['Light Blue', 'Dark Blue'],
    image: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 40,
    featured: false,
    tags: ['kids', 'denim', 'jacket', 'layering'],
    rating: 4.4
  },
  {
    name: 'Playtime Dress',
    description: 'Comfortable dress for girls, perfect for playtime and casual occasions.',
    price: 69,
    category: 'kids',
    subcategory: 'dresses',
    brand: 'Play & Fun',
    sizes: ['S', 'M', 'L'],
    colors: ['Pink', 'Purple', 'Yellow'],
    image: 'https://images.unsplash.com/photo-1518396745084-d0d9e34c7e8a?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1518396745084-d0d9e34c7e8a?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 55,
    featured: true,
    tags: ['kids', 'dress', 'playtime', 'comfortable'],
    rating: 4.6
  },
  {
    name: 'Kids Sports Shorts',
    description: 'Comfortable athletic shorts for active kids. Perfect for sports and outdoor activities.',
    price: 45,
    category: 'kids',
    subcategory: 'shorts',
    brand: 'Active Kids',
    sizes: ['S', 'M', 'L'],
    colors: ['Blue', 'Red', 'Black', 'Green'],
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 80,
    featured: false,
    tags: ['kids', 'sports', 'active', 'shorts'],
    rating: 4.3
  },
  {
    name: 'Winter Kids Hoodie',
    description: 'Warm and cozy hoodie for kids. Soft fleece lining for extra comfort during cold weather.',
    price: 89,
    category: 'kids',
    subcategory: 'hoodies',
    brand: 'Cozy Kids',
    sizes: ['S', 'M', 'L'],
    colors: ['Gray', 'Navy', 'Pink', 'Red'],
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 60,
    featured: false,
    tags: ['kids', 'winter', 'hoodie', 'warm'],
    rating: 4.4
  },
  {
    name: 'Kids Formal Suit Set',
    description: 'Complete formal suit set for special occasions. Includes jacket, pants, and shirt.',
    price: 189,
    category: 'kids',
    subcategory: 'formal',
    brand: 'Little Gentleman',
    sizes: ['S', 'M', 'L'],
    colors: ['Navy', 'Black', 'Gray'],
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=600&fit=crop&crop=center',
    images: [
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=600&fit=crop&crop=center'
    ],
    stock: 25,
    featured: true,
    tags: ['kids', 'formal', 'suit', 'special occasion'],
    rating: 4.7
  }
];

// Function to seed users with detailed logging
async function seedUsers() {
  try {
    console.log('🔄 Starting user seeding...');
    
    // Clear existing users
    const deletedUsers = await User.deleteMany({});
    console.log(`🗑️ Cleared ${deletedUsers.deletedCount} existing users`);

    // Hash passwords
    const processedUsers = [];
    for (const userData of usersData) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      processedUsers.push({
        ...userData,
        password: hashedPassword
      });
    }

    // Insert new users
    const insertedUsers = await User.insertMany(processedUsers);
    console.log(`✅ Successfully created ${insertedUsers.length} users:`);
    insertedUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    return true;
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    return false;
  }
}

// Function to seed products with detailed logging
async function seedProducts() {
  try {
    console.log('🔄 Starting product seeding...');
    
    // Clear existing products
    const deletedProducts = await Product.deleteMany({});
    console.log(`🗑️ Cleared ${deletedProducts.deletedCount} existing products`);

    // Validate product data
    console.log('🔍 Validating product data...');
    for (let i = 0; i < productsData.length; i++) {
      const product = productsData[i];
      if (!product.image) {
        console.error(`❌ Product ${i + 1} (${product.name}) is missing image field`);
        return false;
      }
      if (!product.name || !product.description || !product.price || !product.category) {
        console.error(`❌ Product ${i + 1} is missing required fields`);
        return false;
      }
    }
    console.log('✅ All product data validated');

    // Insert new products
    const insertedProducts = await Product.insertMany(productsData);
    console.log(`✅ Successfully created ${insertedProducts.length} products:`);
    
    // Group by category for better display
    const categories = ['men', 'women', 'kids'];
    categories.forEach(category => {
      const categoryProducts = insertedProducts.filter(p => p.category === category);
      console.log(`   📦 ${category.toUpperCase()}: ${categoryProducts.length} products`);
      categoryProducts.forEach(product => {
        console.log(`      - ${product.name} (AED ${product.price}) ${product.featured ? '⭐' : ''}`);
      });
    });

    return true;
  } catch (error) {
    console.error('❌ Error seeding products:', error.message);
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`   Field ${key}: ${error.errors[key].message}`);
      });
    }
    return false;
  }
}

// Main seeding function with comprehensive error handling
async function seedDatabase() {
  console.log('🌱 Starting Silk Touch database seeding...');
  console.log('================================================');
  
  try {
    // Connect to database
    const connected = await connectDB();
    if (!connected) {
      console.error('❌ Cannot proceed without database connection');
      process.exit(1);
    }

    // Seed users
    const usersSeeded = await seedUsers();
    if (!usersSeeded) {
      console.error('❌ User seeding failed, aborting...');
      process.exit(1);
    }

    // Seed products
    const productsSeeded = await seedProducts();
    if (!productsSeeded) {
      console.error('❌ Product seeding failed, aborting...');
      process.exit(1);
    }
    
    // Success summary
    console.log('\n================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('================================================');
    console.log('\n📊 FINAL SUMMARY:');
    console.log(`👥 Users: ${usersData.length} (1 admin, ${usersData.length - 1} customers)`);
    console.log(`🛍️ Products: ${productsData.length} total (all with images)`);
    console.log('   - Men: 6 products (shirts, jeans, blazers, t-shirts, polos, sweaters)');
    console.log('   - Women: 7 products (dresses, blouses, jeans, sweaters, blazers, accessories)'); 
    console.log('   - Kids: 7 products (t-shirts, polos, jackets, dresses, shorts, hoodies, formal)');
    console.log('\n📋 TEST ACCOUNTS:');
    console.log('🔐 Admin: admin@silktouch.com / admin123');
    console.log('👤 User: sarah@example.com / user123');
    console.log('👤 User: mohammed@example.com / user123');
    console.log('\n🖼️ All products include high-quality images!');
    console.log('🚀 Your Silk Touch store is ready to go!');
    
    // Verify data was actually inserted
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    console.log('\n🔍 VERIFICATION:');
    console.log(`✅ Users in database: ${userCount}`);
    console.log(`✅ Products in database: ${productCount}`);
    
  } catch (error) {
    console.error('\n❌ SEEDING FAILED:');
    console.error('Error:', error.message);
    console.error('\n🔧 TROUBLESHOOTING TIPS:');
    console.error('1. Make sure MongoDB is running');
    console.error('2. Check your connection string in .env file');
    console.error('3. Ensure you have write permissions to the database');
    console.error('4. Try running: npm install mongoose bcryptjs dotenv');
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Export for module usage
module.exports = { 
  seedDatabase, 
  usersData, 
  productsData,
  connectDB,
  User,
  Product 
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}