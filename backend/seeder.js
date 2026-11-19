require("dotenv").config({ path: "./config/config.env" });

const mongoose = require("mongoose");

const Restaurant = require("./models/restaurant");
const Menu = require("./models/menu");
const FoodItem = require("./models/fooditem");

const restaurants = [

{
    name:"Domino's Pizza",
    address:"FC Road, Pune",

    location:{
        type:"Point",
        coordinates:[73.8567,18.5204]
    },

    isVeg:false,
    ratings:4.5,
    numOfReviews:120,

    images:[{
        public_id:"dominos",
        url:"https://images.unsplash.com/photo-1513104890138-7c749659a591"
    }]
},

{
    name:"Pizza Hut",
    address:"Baner, Pune",

    location:{
        type:"Point",
        coordinates:[73.7898,18.5590]
    },

    isVeg:false,
    ratings:4.4,
    numOfReviews:105,

    images:[{
        public_id:"pizzahut",
        url:"https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=600"
    }]
},

{
    name:"Burger King",
    address:"Shivajinagar, Pune",

    location:{
        type:"Point",
        coordinates:[73.8478,18.5314]
    },

    isVeg:false,
    ratings:4.3,
    numOfReviews:180,

    images:[{
        public_id:"bk",
        url:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600"
    }]
},

{
    name:"McDonald's",
    address:"JM Road, Pune",

    location:{
        type:"Point",
        coordinates:[73.8450,18.5235]
    },

    isVeg:false,
    ratings:4.4,
    numOfReviews:210,

    images:[{
        public_id:"mcd",
        url:"https://images.unsplash.com/photo-1550547660-d9450f859349?w=600"
    }]
},

{
    name:"KFC",
    address:"Hinjewadi, Pune",

    location:{
        type:"Point",
        coordinates:[73.6982,18.5912]
    },

    isVeg:false,
    ratings:4.6,
    numOfReviews:280,

    images:[{
        public_id:"kfc",
        url:"https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600"
    }]
},

{
    name:"Subway",
    address:"Wakad, Pune",

    location:{
        type:"Point",
        coordinates:[73.7611,18.6076]
    },

    isVeg:false,
    ratings:4.2,
    numOfReviews:140,

    images:[{
        public_id:"subway",
        url:"https://images.unsplash.com/photo-1627308595229-7830a5c91f9f"
    }]
},

{
    name:"Biryani House",
    address:"Camp, Pune",

    location:{
        type:"Point",
        coordinates:[73.8762,18.5074]
    },

    isVeg:false,
    ratings:4.8,
    numOfReviews:340,

    images:[{
        public_id:"biryani",
        url:"https://images.unsplash.com/photo-1633945274405-b6c8069047b0"
    }]
},

{
    name:"Chinese Wok",
    address:"Kothrud, Pune",

    location:{
        type:"Point",
        coordinates:[73.8125,18.5078]
    },

    isVeg:false,
    ratings:4.5,
    numOfReviews:190,

    images:[{
        public_id:"wok",
        url:"https://images.unsplash.com/photo-1585032226651-759b368d7246"
    }]
},

{
    name:"Naturals Ice Cream",
    address:"Aundh, Pune",

    location:{
        type:"Point",
        coordinates:[73.8077,18.5588]
    },

    isVeg:true,
    ratings:4.9,
    numOfReviews:510,

    images:[{
        public_id:"naturals",
        url:"https://images.unsplash.com/photo-1563805042-7684c019e1cb"
    }]
},

{
    name:"Cafe Coffee Day",
    address:"Magarpatta, Pune",

    location:{
        type:"Point",
        coordinates:[73.9312,18.5154]
    },

    isVeg:true,
    ratings:4.3,
    numOfReviews:130,

    images:[{
        public_id:"ccd",
        url:"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085"
    }]
}

];
const menus = [

/* =======================
   Domino's Pizza (0)
======================= */

{ name:"Pizza", restaurant:0 },
{ name:"Garlic Bread", restaurant:0 },
{ name:"Pasta", restaurant:0 },
{ name:"Beverages", restaurant:0 },

/* =======================
   Pizza Hut (1)
======================= */

{ name:"Pizza", restaurant:1 },
{ name:"Pasta", restaurant:1 },
{ name:"Sides", restaurant:1 },
{ name:"Desserts", restaurant:1 },

/* =======================
   Burger King (2)
======================= */

{ name:"Burgers", restaurant:2 },
{ name:"Fries", restaurant:2 },
{ name:"Snacks", restaurant:2 },
{ name:"Drinks", restaurant:2 },

/* =======================
   McDonald's (3)
======================= */

{ name:"Burgers", restaurant:3 },
{ name:"Fries", restaurant:3 },
{ name:"Wraps", restaurant:3 },
{ name:"McCafe", restaurant:3 },

/* =======================
   KFC (4)
======================= */

{ name:"Chicken", restaurant:4 },
{ name:"Buckets", restaurant:4 },
{ name:"Burgers", restaurant:4 },
{ name:"Drinks", restaurant:4 },

/* =======================
   Subway (5)
======================= */

{ name:"Subs", restaurant:5 },
{ name:"Wraps", restaurant:5 },
{ name:"Salads", restaurant:5 },
{ name:"Cookies", restaurant:5 },

/* =======================
   Biryani House (6)
======================= */

{ name:"Chicken Biryani", restaurant:6 },
{ name:"Veg Biryani", restaurant:6 },
{ name:"Starters", restaurant:6 },
{ name:"Beverages", restaurant:6 },

/* =======================
   Chinese Wok (7)
======================= */

{ name:"Noodles", restaurant:7 },
{ name:"Fried Rice", restaurant:7 },
{ name:"Momos", restaurant:7 },
{ name:"Soups", restaurant:7 },

/* =======================
   Naturals Ice Cream (8)
======================= */

{ name:"Ice Cream", restaurant:8 },
{ name:"Sundaes", restaurant:8 },
{ name:"Milkshakes", restaurant:8 },
{ name:"Family Packs", restaurant:8 },

/* =======================
   Cafe Coffee Day (9)
======================= */

{ name:"Hot Coffee", restaurant:9 },
{ name:"Cold Coffee", restaurant:9 },
{ name:"Sandwiches", restaurant:9 },
{ name:"Cakes", restaurant:9 }

];

const foodItems = [

/* =====================================================
   DOMINO'S PIZZA
   Restaurant = 0
===================================================== */

// Pizza (Menu = 0)

{
    name: "Margherita Pizza",
    price: 249,
    description: "Classic cheese pizza",
    restaurant: 0,
    menu: 0
},

{
    name: "Farmhouse Pizza",
    price: 399,
    description: "Loaded with fresh vegetables",
    restaurant: 0,
    menu: 0
},

{
    name: "Veg Supreme Pizza",
    price: 449,
    description: "Loaded with veggies and cheese",
    restaurant: 0,
    menu: 0
},

// Garlic Bread (Menu = 1)

{
    name: "Garlic Breadsticks",
    price: 149,
    description: "Fresh garlic bread",
    restaurant: 0,
    menu: 1
},

{
    name: "Stuffed Garlic Bread",
    price: 199,
    description: "Stuffed cheesy garlic bread",
    restaurant: 0,
    menu: 1
},

{
    name: "Cheesy Garlic Bread",
    price: 179,
    description: "Garlic bread with mozzarella",
    restaurant: 0,
    menu: 1
},

// Pasta (Menu = 2)

{
    name: "White Sauce Pasta",
    price: 229,
    description: "Creamy white sauce pasta",
    restaurant: 0,
    menu: 2
},

{
    name: "Red Sauce Pasta",
    price: 229,
    description: "Italian tomato pasta",
    restaurant: 0,
    menu: 2
},

{
    name: "Cheesy Pasta",
    price: 249,
    description: "Extra cheese pasta",
    restaurant: 0,
    menu: 2
},

// Beverages (Menu = 3)

{
    name: "Coca Cola",
    price: 60,
    description: "Refreshing cold drink",
    restaurant: 0,
    menu: 3
},

{
    name: "Sprite",
    price: 60,
    description: "Lemon soft drink",
    restaurant: 0,
    menu: 3
},

{
    name: "Pepsi",
    price: 60,
    description: "Cold beverage",
    restaurant: 0,
    menu: 3
},

/* =====================================================
   PIZZA HUT
   Restaurant = 1
===================================================== */

// Pizza (Menu = 4)

{
    name: "Cheese Lovers Pizza",
    price: 379,
    description: "Loaded with cheese",
    restaurant: 1,
    menu: 4
},

{
    name: "Veggie Supreme Pizza",
    price: 429,
    description: "Fresh vegetables pizza",
    restaurant: 1,
    menu: 4
},

{
    name: "Chicken Supreme Pizza",
    price: 499,
    description: "Loaded chicken pizza",
    restaurant: 1,
    menu: 4
},

// Pasta (Menu = 5)

{
    name: "Creamy Alfredo Pasta",
    price: 239,
    description: "Creamy Alfredo pasta",
    restaurant: 1,
    menu: 5
},

{
    name: "Spicy Arrabbiata Pasta",
    price: 249,
    description: "Spicy red sauce pasta",
    restaurant: 1,
    menu: 5
},

{
    name: "Cheese Pasta Bake",
    price: 269,
    description: "Baked cheese pasta",
    restaurant: 1,
    menu: 5
},

// Sides (Menu = 6)

{
    name: "French Fries",
    price: 129,
    description: "Golden crispy fries",
    restaurant: 1,
    menu: 6
},

{
    name: "Chicken Wings",
    price: 249,
    description: "Hot crispy wings",
    restaurant: 1,
    menu: 6
},

{
    name: "Cheese Garlic Bread",
    price: 189,
    description: "Garlic bread with cheese",
    restaurant: 1,
    menu: 6
},

// Desserts (Menu = 7)

{
    name: "Chocolate Lava Cake",
    price: 149,
    description: "Hot chocolate lava cake",
    restaurant: 1,
    menu: 7
},

{
    name: "Brownie",
    price: 129,
    description: "Chocolate brownie",
    restaurant: 1,
    menu: 7
},

{
    name: "Chocolate Mousse",
    price: 159,
    description: "Chocolate mousse dessert",
    restaurant: 1,
    menu: 7
},
/* =====================================================
   BURGER KING
   Restaurant = 2
===================================================== */

// Burgers (Menu = 8)

{
    name:"Whopper",
    price:199,
    description:"Classic Whopper Burger",
    restaurant:2,
    menu:8
},

{
    name:"Veg Whopper",
    price:179,
    description:"Veg burger",
    restaurant:2,
    menu:8
},

{
    name:"Chicken Whopper",
    price:229,
    description:"Chicken burger",
    restaurant:2,
    menu:8
},

// Fries (Menu = 9)

{
    name:"Regular Fries",
    price:99,
    description:"Salted crispy fries",
    restaurant:2,
    menu:9
},

{
    name:"Cheese Fries",
    price:149,
    description:"Loaded cheese fries",
    restaurant:2,
    menu:9
},

{
    name:"Peri Peri Fries",
    price:129,
    description:"Spicy peri peri fries",
    restaurant:2,
    menu:9
},

// Snacks (Menu = 10)

{
    name:"Chicken Nuggets",
    price:169,
    description:"Crispy chicken nuggets",
    restaurant:2,
    menu:10
},

{
    name:"Veg Nuggets",
    price:149,
    description:"Veg nuggets",
    restaurant:2,
    menu:10
},

{
    name:"Onion Rings",
    price:129,
    description:"Golden onion rings",
    restaurant:2,
    menu:10
},

// Drinks (Menu = 11)

{
    name:"Coke",
    price:60,
    description:"Cold drink",
    restaurant:2,
    menu:11
},

{
    name:"Fanta",
    price:60,
    description:"Orange drink",
    restaurant:2,
    menu:11
},

{
    name:"Sprite",
    price:60,
    description:"Lemon drink",
    restaurant:2,
    menu:11
},

/* =====================================================
   McDONALD'S
   Restaurant = 3
===================================================== */

// Burgers (Menu = 12)

{
    name:"McAloo Tikki",
    price:89,
    description:"Popular veg burger",
    restaurant:3,
    menu:12
},

{
    name:"McChicken",
    price:149,
    description:"Chicken burger",
    restaurant:3,
    menu:12
},

{
    name:"Big Mac",
    price:249,
    description:"Signature Big Mac",
    restaurant:3,
    menu:12
},

// Fries (Menu = 13)

{
    name:"Medium Fries",
    price:109,
    description:"Golden fries",
    restaurant:3,
    menu:13
},

{
    name:"Large Fries",
    price:139,
    description:"Large crispy fries",
    restaurant:3,
    menu:13
},

{
    name:"Cheese Fries",
    price:159,
    description:"Cheese loaded fries",
    restaurant:3,
    menu:13
},

// Wraps (Menu = 14)

{
    name:"Veg Wrap",
    price:149,
    description:"Veg wrap",
    restaurant:3,
    menu:14
},

{
    name:"Chicken Wrap",
    price:179,
    description:"Chicken wrap",
    restaurant:3,
    menu:14
},

{
    name:"Paneer Wrap",
    price:169,
    description:"Paneer wrap",
    restaurant:3,
    menu:14
},

// McCafe (Menu = 15)

{
    name:"Cappuccino",
    price:139,
    description:"Hot cappuccino",
    restaurant:3,
    menu:15
},

{
    name:"Latte",
    price:149,
    description:"Fresh latte",
    restaurant:3,
    menu:15
},

{
    name:"Cold Coffee",
    price:159,
    description:"Chilled cold coffee",
    restaurant:3,
    menu:15
},

/* =====================================================
   KFC
   Restaurant = 4
===================================================== */

// Chicken (Menu = 16)

{
    name:"Hot & Crispy Chicken",
    price:229,
    description:"Fried chicken",
    restaurant:4,
    menu:16
},

{
    name:"Chicken Popcorn",
    price:199,
    description:"Popcorn chicken",
    restaurant:4,
    menu:16
},

{
    name:"Chicken Strips",
    price:189,
    description:"Chicken strips",
    restaurant:4,
    menu:16
},

// Buckets (Menu = 17)

{
    name:"Chicken Bucket 6 pcs",
    price:699,
    description:"6 pieces chicken bucket",
    restaurant:4,
    menu:17
},

{
    name:"Chicken Bucket 12 pcs",
    price:1299,
    description:"12 pieces bucket",
    restaurant:4,
    menu:17
},

{
    name:"Family Bucket",
    price:1499,
    description:"Family bucket combo",
    restaurant:4,
    menu:17
},

// Burgers (Menu = 18)

{
    name:"Zinger Burger",
    price:219,
    description:"Classic Zinger Burger",
    restaurant:4,
    menu:18
},

{
    name:"Veg Zinger",
    price:199,
    description:"Veg Zinger Burger",
    restaurant:4,
    menu:18
},

{
    name:"Double Zinger",
    price:299,
    description:"Double chicken burger",
    restaurant:4,
    menu:18
},

// Drinks (Menu = 19)

{
    name:"Pepsi",
    price:60,
    description:"Cold drink",
    restaurant:4,
    menu:19
},

{
    name:"7UP",
    price:60,
    description:"Lemon soft drink",
    restaurant:4,
    menu:19
},

{
    name:"Mirinda",
    price:60,
    description:"Orange soft drink",
    restaurant:4,
    menu:19
},
/* =====================================================
   SUBWAY
   Restaurant = 5
===================================================== */

// Subs (Menu = 20)

{
    name:"Veggie Delight",
    price:189,
    description:"Fresh vegetable sub",
    restaurant:5,
    menu:20
},

{
    name:"Paneer Tikka Sub",
    price:229,
    description:"Paneer tikka sandwich",
    restaurant:5,
    menu:20
},

{
    name:"Chicken Teriyaki Sub",
    price:269,
    description:"Chicken teriyaki sub",
    restaurant:5,
    menu:20
},

// Wraps (Menu = 21)

{
    name:"Veg Wrap",
    price:189,
    description:"Healthy veg wrap",
    restaurant:5,
    menu:21
},

{
    name:"Chicken Wrap",
    price:249,
    description:"Chicken wrap",
    restaurant:5,
    menu:21
},

{
    name:"Paneer Wrap",
    price:229,
    description:"Paneer wrap",
    restaurant:5,
    menu:21
},

// Salads (Menu = 22)

{
    name:"Veg Salad",
    price:169,
    description:"Fresh vegetable salad",
    restaurant:5,
    menu:22
},

{
    name:"Chicken Salad",
    price:239,
    description:"Chicken salad",
    restaurant:5,
    menu:22
},

{
    name:"Paneer Salad",
    price:219,
    description:"Paneer salad",
    restaurant:5,
    menu:22
},

// Cookies (Menu = 23)

{
    name:"Chocolate Cookie",
    price:59,
    description:"Chocolate cookie",
    restaurant:5,
    menu:23
},

{
    name:"Double Choco Cookie",
    price:69,
    description:"Double chocolate cookie",
    restaurant:5,
    menu:23
},

{
    name:"Oatmeal Cookie",
    price:59,
    description:"Healthy oatmeal cookie",
    restaurant:5,
    menu:23
},

/* =====================================================
   BIRYANI HOUSE
===================================================== */

// Chicken Biryani (24)

{
name:"Hyderabadi Chicken Biryani",
price:349,
description:"Authentic Hyderabadi biryani",
restaurant:6,
menu:24
},

{
name:"Chicken Dum Biryani",
price:329,
description:"Slow cooked biryani",
restaurant:6,
menu:24
},

{
name:"Boneless Chicken Biryani",
price:379,
description:"Boneless chicken biryani",
restaurant:6,
menu:24
},

// Veg Biryani (25)

{
name:"Veg Dum Biryani",
price:249,
description:"Vegetable biryani",
restaurant:6,
menu:25
},

{
name:"Paneer Biryani",
price:289,
description:"Paneer biryani",
restaurant:6,
menu:25
},

{
name:"Mushroom Biryani",
price:299,
description:"Mushroom biryani",
restaurant:6,
menu:25
},

// Starters (26)

{
name:"Chicken Tikka",
price:299,
description:"Grilled chicken tikka",
restaurant:6,
menu:26
},

{
name:"Paneer Tikka",
price:269,
description:"Paneer tikka",
restaurant:6,
menu:26
},

{
name:"Chicken Lollipop",
price:279,
description:"Spicy chicken lollipop",
restaurant:6,
menu:26
},

// Drinks (27)

{
name:"Sweet Lassi",
price:79,
description:"Refreshing lassi",
restaurant:6,
menu:27
},

{
name:"Masala Buttermilk",
price:59,
description:"Chilled buttermilk",
restaurant:6,
menu:27
},

{
name:"Fresh Lime Soda",
price:69,
description:"Fresh lime soda",
restaurant:6,
menu:27
},

/* =====================================================
   CHINESE WOK
===================================================== */

// Noodles (28)

{
name:"Hakka Noodles",
price:219,
description:"Veg hakka noodles",
restaurant:7,
menu:28
},

{
name:"Chicken Hakka Noodles",
price:269,
description:"Chicken noodles",
restaurant:7,
menu:28
},

{
name:"Schezwan Noodles",
price:249,
description:"Spicy noodles",
restaurant:7,
menu:28
},

// Fried Rice (29)

{
name:"Veg Fried Rice",
price:199,
description:"Veg fried rice",
restaurant:7,
menu:29
},

{
name:"Chicken Fried Rice",
price:249,
description:"Chicken fried rice",
restaurant:7,
menu:29
},

{
name:"Schezwan Fried Rice",
price:239,
description:"Spicy fried rice",
restaurant:7,
menu:29
},

// Momos (30)

{
name:"Veg Momos",
price:149,
description:"Steamed veg momos",
restaurant:7,
menu:30
},

{
name:"Chicken Momos",
price:179,
description:"Chicken momos",
restaurant:7,
menu:30
},

{
name:"Fried Momos",
price:189,
description:"Crispy fried momos",
restaurant:7,
menu:30
},

// Soups (31)

{
name:"Manchow Soup",
price:149,
description:"Hot Manchow soup",
restaurant:7,
menu:31
},

{
name:"Sweet Corn Soup",
price:139,
description:"Sweet corn soup",
restaurant:7,
menu:31
},

{
name:"Hot & Sour Soup",
price:149,
description:"Chinese soup",
restaurant:7,
menu:31
},

/* =====================================================
   NATURALS ICE CREAM
===================================================== */

// Ice Cream (32)

{
name:"Mango Ice Cream",
price:99,
description:"Fresh mango ice cream",
restaurant:8,
menu:32
},

{
name:"Tender Coconut",
price:109,
description:"Tender coconut ice cream",
restaurant:8,
menu:32
},

{
name:"Chocolate Ice Cream",
price:99,
description:"Chocolate flavour",
restaurant:8,
menu:32
},

// Sundaes (33)

{
name:"Chocolate Sundae",
price:149,
description:"Chocolate sundae",
restaurant:8,
menu:33
},

{
name:"Brownie Sundae",
price:179,
description:"Brownie sundae",
restaurant:8,
menu:33
},

{
name:"Caramel Sundae",
price:159,
description:"Caramel sundae",
restaurant:8,
menu:33
},

// Milkshakes (34)

{
name:"Chocolate Shake",
price:169,
description:"Chocolate milkshake",
restaurant:8,
menu:34
},

{
name:"Mango Shake",
price:169,
description:"Fresh mango shake",
restaurant:8,
menu:34
},

{
name:"Oreo Shake",
price:189,
description:"Oreo milkshake",
restaurant:8,
menu:34
},

// Family Packs (35)

{
name:"Chocolate Family Pack",
price:399,
description:"1 litre chocolate ice cream",
restaurant:8,
menu:35
},

{
name:"Mango Family Pack",
price:399,
description:"1 litre mango ice cream",
restaurant:8,
menu:35
},

{
name:"Mixed Family Pack",
price:449,
description:"Mixed flavours",
restaurant:8,
menu:35
},
/* =====================================================
   CAFE COFFEE DAY
===================================================== */

// Hot Coffee (36)

{
name:"Espresso",
price:129,
description:"Classic espresso",
restaurant:9,
menu:36
},

{
name:"Cappuccino",
price:169,
description:"Hot cappuccino",
restaurant:9,
menu:36
},

{
name:"Cafe Latte",
price:179,
description:"Milk coffee",
restaurant:9,
menu:36
},

// Cold Coffee (37)

{
name:"Cold Coffee",
price:189,
description:"Cold coffee",
restaurant:9,
menu:37
},

{
name:"Mocha Frappe",
price:209,
description:"Chocolate frappe",
restaurant:9,
menu:37
},

{
name:"Caramel Frappe",
price:219,
description:"Caramel frappe",
restaurant:9,
menu:37
},

// Sandwiches (38)

{
name:"Veg Sandwich",
price:169,
description:"Fresh sandwich",
restaurant:9,
menu:38
},

{
name:"Chicken Sandwich",
price:219,
description:"Chicken sandwich",
restaurant:9,
menu:38
},

{
name:"Paneer Sandwich",
price:199,
description:"Paneer sandwich",
restaurant:9,
menu:38
},

// Cakes (39)

{
name:"Chocolate Truffle",
price:149,
description:"Chocolate cake",
restaurant:9,
menu:39
},

{
name:"Red Velvet Cake",
price:169,
description:"Red velvet cake",
restaurant:9,
menu:39
},

{
name:"Blueberry Cheesecake",
price:199,
description:"Blueberry cheesecake",
restaurant:9,
menu:39
}

];

async function seed() {
  try {

    // Connect MongoDB
    await mongoose.connect(process.env.DB_URI);
    console.log("✅ MongoDB Connected");

    // Delete Old Data
    await FoodItem.deleteMany();
    await Menu.deleteMany();
    await Restaurant.deleteMany();

    console.log("🗑 Old Data Deleted");

    // ==========================
    // Insert Restaurants
    // ==========================

    const insertedRestaurants =
      await Restaurant.insertMany(restaurants);

    console.log("🏪 Restaurants Added");

    // ==========================
    // Prepare Menus
    // ==========================

    const menuData = menus.map(menu => ({
      name: menu.name,
      restaurant:
        insertedRestaurants[menu.restaurant]._id
    }));

    const insertedMenus =
      await Menu.insertMany(menuData);

    console.log("📋 Menus Added");

function getSpecificFoodImage(name = "") {
  const n = (name || "").toLowerCase();

  // Biryanis
  if (n.includes("biryani")) return "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600";

  // Pizzas
  if (n.includes("margherita")) return "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600";
  if (n.includes("farmhouse")) return "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600";
  if (n.includes("supreme")) return "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600";
  if (n.includes("pepperoni")) return "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600";
  if (n.includes("pizza")) return "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600";

  // Garlic Bread
  if (n.includes("garlic bread")) return "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=600";

  // Pastas
  if (n.includes("white sauce") || n.includes("alfredo")) return "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600";
  if (n.includes("red sauce") || n.includes("arrabiata")) return "https://images.unsplash.com/photo-1621996346565-e3d5d6281692?w=600";
  if (n.includes("pasta")) return "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600";

  // Burgers
  if (n.includes("whopper") || n.includes("burger") || n.includes("mcaloo") || n.includes("mcchicken") || n.includes("big mac") || n.includes("zinger")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600";
  }

  // Fries & Onion Rings
  if (n.includes("onion ring")) return "https://images.unsplash.com/photo-1639024471287-032f66705664?w=600";
  if (n.includes("fries")) return "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600";

  // Nuggets & Chicken Popcorn
  if (n.includes("nuggets") || n.includes("popcorn") || n.includes("strips")) {
    return "https://images.unsplash.com/photo-1562967914-608f82629710?w=600";
  }

  // Chicken Wings & Buckets
  if (n.includes("wings") || n.includes("bucket") || n.includes("crispy chicken")) {
    return "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600";
  }

  // Tandoori / Tikka / Lollipop / Kebab
  if (n.includes("tikka") || n.includes("lollipop") || n.includes("kebab") || n.includes("tandoori")) {
    return "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600";
  }

  // Asian / Chinese
  if (n.includes("momo") || n.includes("dumpling")) return "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600";
  if (n.includes("noodles") || n.includes("chowmein")) return "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600";
  if (n.includes("fried rice") || n.includes("rice")) return "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600";
  if (n.includes("soup")) return "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600";

  // Wraps, Subs & Sandwiches
  if (n.includes("wrap") || n.includes("roll")) return "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600";
  if (n.includes("sub") || n.includes("sandwich")) return "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600";
  if (n.includes("salad")) return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600";

  // Cold Drinks, Colas, Sodas
  if (n.includes("coca") || n.includes("cola") || n.includes("coke") || n.includes("thums up")) {
    return "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600";
  }
  if (n.includes("pepsi")) return "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=600";
  if (n.includes("sprite") || n.includes("7up") || n.includes("lime soda") || n.includes("lemonade")) {
    return "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600";
  }
  if (n.includes("fanta") || n.includes("mirinda") || n.includes("orange")) {
    return "https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=600";
  }
  if (n.includes("lassi") || n.includes("buttermilk") || n.includes("chaas")) {
    return "https://images.unsplash.com/photo-1571006682875-9e663a890e0c?w=600";
  }

  // Coffee & Frappes
  if (n.includes("cold coffee") || n.includes("frappe")) return "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600";
  if (n.includes("coffee") || n.includes("cappuccino") || n.includes("latte") || n.includes("espresso") || n.includes("mocha")) {
    return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600";
  }

  // Desserts, Cakes, Ice Creams
  if (n.includes("truffle") || n.includes("cake") || n.includes("cheesecake") || n.includes("pastry")) {
    return "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600";
  }
  if (n.includes("brownie") || n.includes("choco lava") || n.includes("mousse")) {
    return "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600";
  }
  if (n.includes("cookie")) return "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600";
  if (n.includes("shake") || n.includes("milkshake")) return "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600";
  if (n.includes("coconut")) return "https://images.unsplash.com/photo-1588767763179-259f7244907a?w=600";
  if (n.includes("ice cream") || n.includes("sundae")) return "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600";

  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600";
}

    // ==========================
    // Prepare Food Items
    // ==========================

    const foodData = foodItems.map(food => ({

      name: food.name,
      price: food.price,
      description: food.description,

      restaurant:
        insertedRestaurants[
          food.restaurant
        ]._id,

      menu:
        insertedMenus[
          food.menu
        ]._id,

      image: [
        {
          public_id: "food",
          url: getSpecificFoodImage(food.name)
        }
      ],

      stock: 100,

      rating: 4.5,

      numberOfReviews: 0,

      reviews: []

    }));

    await FoodItem.insertMany(foodData);

    console.log("🍕 Food Items Added");

    console.log("🎉 Database Seeded Successfully");

    process.exit();

  } catch (err) {

    console.log(err);

    process.exit(1);

  }
}

seed();