const fs = require("fs");
const path = require("path");

const restaurants = require("./restaurants.json").restaurant;

const foodTemplates = {
  "Haldiram's": [
    {
      name: "Sweets and Chaat",
      items: [
        { name: "Raj Kachori", price: 120, description: "Crispy kachori filled with potatoes, yogurt and tangy chutneys", url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500" },
        { name: "Pani Puri", price: 60, description: "Crispy puris filled with spicy tangy mint water", url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500" },
        { name: "Chole Bhature", price: 160, description: "Fluffy bhature served with rich spicy chickpea curry", url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500" }
      ]
    },
    {
      name: "South Indian Delights",
      items: [
        { name: "Masala Dosa", price: 140, description: "Crisp golden crepe stuffed with spiced mashed potatoes", url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500" },
        { name: "Idli Sambar", price: 90, description: "Steamed fluffy rice cakes with hot flavorful sambar", url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500" }
      ]
    },
    {
      name: "North Indian Meals",
      items: [
        { name: "Paneer Butter Masala", price: 220, description: "Cottage cheese cubes in rich tomato cashew gravy", url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500" },
        { name: "Butter Naan", price: 45, description: "Tandoor baked soft flatbread brushed with butter", url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500" }
      ]
    }
  ],
  "Mani's Dum Biryani": [
    {
      name: "Special Dum Biryanis",
      items: [
        { name: "Chicken Dum Biryani", price: 280, description: "Fragrant basmati rice layered with succulent chicken pieces", url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500" },
        { name: "Mutton Dum Biryani", price: 380, description: "Slow-cooked tender mutton with spiced aromatic saffron rice", url: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500" },
        { name: "Veg Dum Biryani", price: 210, description: "Assorted vegetables marinated with spices and basmati rice", url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500" }
      ]
    },
    {
      name: "Starters and Kebabs",
      items: [
        { name: "Chicken 65", price: 220, description: "Deep fried spicy chicken bites with curry leaves", url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500" },
        { name: "Paneer 65", price: 180, description: "Crispy fried paneer cubes with south Indian spices", url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500" }
      ]
    }
  ],
  "KFC": [
    {
      name: "Chicken Buckets",
      items: [
        { name: "Hot and Crispy Chicken (4 Pcs)", price: 399, description: "Signature crispy bone-in chicken pieces", url: "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=500" },
        { name: "Popcorn Chicken Bucket", price: 299, description: "Bite-sized tender boneless chicken nuggets", url: "https://images.unsplash.com/photo-1562967914-608f82629710?w=500" },
        { name: "Peri Peri Chicken Strips", price: 249, description: "Boneless chicken tenders tossed with spicy peri peri sprinkle", url: "https://images.unsplash.com/photo-1562967914-608f82629710?w=500" }
      ]
    },
    {
      name: "Burgers and Rolls",
      items: [
        { name: "Classic Zinger Burger", price: 199, description: "Crispy fillet with lettuce and creamy mayo on sesame bun", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500" },
        { name: "Chicken Roll", price: 149, description: "Crispy chicken wrapped in soft tortilla with sauce", url: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=500" }
      ]
    }
  ],
  "Daily Sushi": [
    {
      name: "Sushi Rolls",
      items: [
        { name: "California Roll (8 Pcs)", price: 380, description: "Crabstick, avocado, cucumber with toasted sesame", url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500" },
        { name: "Spicy Salmon Roll (8 Pcs)", price: 440, description: "Fresh salmon tossed in spicy sriracha mayo", url: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=500" },
        { name: "Avocado Cucumber Roll (8 Pcs)", price: 320, description: "Creamy avocado and fresh crisp cucumber roll", url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500" }
      ]
    },
    {
      name: "Ramen and Bowls",
      items: [
        { name: "Chicken Shoyu Ramen", price: 360, description: "Rich broth with noodles, chicken slices and soft boiled egg", url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500" },
        { name: "Chicken Gyoza (6 Pcs)", price: 260, description: "Pan fried Japanese dumplings served with dip", url: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=500" }
      ]
    }
  ]
};

const defaultTemplate = [
  {
    name: "Main Course",
    items: [
      { name: "Special Biryani", price: 299, description: "Chef special biryani with spices and raita", url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500" },
      { name: "Butter Chicken", price: 280, description: "Tender chicken cooked in creamy tomato butter gravy", url: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500" },
      { name: "Paneer Tikka Masala", price: 240, description: "Grilled cottage cheese cubes in rich spicy gravy", url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500" }
    ]
  },
  {
    name: "Starters and Breads",
    items: [
      { name: "Chicken Tikka", price: 260, description: "Tender charred chicken morsels from the tandoor", url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500" },
      { name: "Butter Naan", price: 80, description: "Crisp layered tandoor bread brushed with butter", url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500" }
    ]
  }
];

const allData = {};
let idCounter = 1000;

restaurants.forEach((r) => {
  const tpl = foodTemplates[r.name.trim()] || defaultTemplate;
  allData[r._id] = tpl.map((category, catIdx) => {
    const menuId = "menu_" + r._id.substring(18) + "_" + catIdx;
    return {
      _id: menuId,
      name: category.name,
      restaurant: r._id,
      foodItems: category.items.map((item, itemIdx) => {
        const foodId = "food_" + r._id.substring(18) + "_" + catIdx + "_" + itemIdx;
        return {
          _id: foodId,
          name: item.name,
          price: item.price,
          description: item.description,
          ratings: 4.5,
          stock: 50,
          numberOfReviews: 12,
          reviews: [],
          menu: menuId,
          restaurant: r._id,
          image: [
            {
              public_id: "food_" + item.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
              url: item.url
            }
          ]
        };
      })
    };
  });
});

fs.writeFileSync(path.join(__dirname, "sampleMenus.json"), JSON.stringify(allData, null, 2));
console.log("Created sampleMenus.json with entries for " + Object.keys(allData).length + " restaurants.");

