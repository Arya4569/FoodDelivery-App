require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
const Restaurant = require('./models/restaurant');

(async () => {
  try {
    await mongoose.connect(process.env.DB_URI);
    const count = await Restaurant.countDocuments();
    console.log('Restaurant count:', count);
    const docs = await Restaurant.find().limit(5);
    console.log('Sample docs:', docs);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
})();
