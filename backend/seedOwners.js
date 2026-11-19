const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "config/config.env") });

const mongoose = require("mongoose");
const User = require("./models/user");
const Restaurant = require("./models/restaurant");

async function seedOwners() {
  await mongoose.connect(process.env.DB_URI);
  console.log("Connected to MongoDB.");

  let owner1 = await User.findOne({ email: "owner.dominos@foodapp.com" });
  if (!owner1) {
    owner1 = await User.create({
      name: "Domino Owner",
      email: "owner.dominos@foodapp.com",
      phoneNumber: "9876543211",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "restaurant_owner",
    });
    console.log("Created Owner 1:", owner1.email);
  } else {
    owner1.role = "restaurant_owner";
    await owner1.save({ validateBeforeSave: false });
  }

  let owner2 = await User.findOne({ email: "owner.burgerking@foodapp.com" });
  if (!owner2) {
    owner2 = await User.create({
      name: "Burger King Owner",
      email: "owner.burgerking@foodapp.com",
      phoneNumber: "9876543212",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "restaurant_owner",
    });
    console.log("Created Owner 2:", owner2.email);
  } else {
    owner2.role = "restaurant_owner";
    await owner2.save({ validateBeforeSave: false });
  }

  // Assign Domino's Pizza specifically to owner1
  const dominos = await Restaurant.findOne({ name: "Domino's Pizza" });
  if (dominos) {
    dominos.owner = owner1._id;
    dominos.description = "Hot, fresh handcrafted pizzas and garlic breads.";
    dominos.phoneNumber = "9876543211";
    dominos.openingTime = "10:00";
    dominos.closingTime = "23:00";
    dominos.deliveryTime = 30;
    dominos.deliveryRadius = 10;
    dominos.isOpen = true;
    await dominos.save();
    console.log("Linked Domino's Pizza to Owner 1:", owner1.email);
  }

  // Assign Burger King specifically to owner2
  const bk = await Restaurant.findOne({ name: "Burger King" });
  if (bk) {
    bk.owner = owner2._id;
    bk.description = "Flame-grilled whoppers, crispy burgers and sides.";
    bk.phoneNumber = "9876543212";
    bk.openingTime = "11:00";
    bk.closingTime = "23:00";
    bk.deliveryTime = 25;
    bk.deliveryRadius = 8;
    bk.isOpen = true;
    await bk.save();
    console.log("Linked Burger King to Owner 2:", owner2.email);
  }

  console.log("Safe owner assignment complete.");
  await mongoose.disconnect();
}

seedOwners().catch((err) => {
  console.error(err);
  process.exit(1);
});

