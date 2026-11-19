// Intelligent food dish image mapper for authentic Swiggy / Zomato appearance
export function getFoodItemImage(name = "", currentUrl = "") {
  // If the current image is already a valid specific URL and NOT the generic salad image or placeholder or cafe room, use it
  if (
    currentUrl &&
    !currentUrl.includes("photo-1546069901-ba9599a7e63c") &&
    !currentUrl.includes("photo-1555396273-367ea4eb4db5") &&
    !currentUrl.includes("placeholder") &&
    currentUrl.startsWith("http")
  ) {
    return currentUrl;
  }

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

  // Chocolate & Desserts (checked before colas so 'chocolate' never matches 'cola')
  if (n.includes("chocolate") || n.includes("choco")) {
    if (n.includes("shake")) return "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600";
    if (n.includes("cake") || n.includes("truffle")) return "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600";
    if (n.includes("lava") || n.includes("brownie") || n.includes("mousse")) return "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600";
    return "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600";
  }

  // Cold Drinks, Colas, Sodas (Coca-Cola chilled can)
  if (n.includes("coca") || (/\bcola\b/i).test(n) || n.includes("coke") || n.includes("thums up")) {
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
  if (n.includes("brownie") || n.includes("lava") || n.includes("mousse")) {
    return "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600";
  }
  if (n.includes("cookie")) return "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600";
  if (n.includes("shake") || n.includes("milkshake")) return "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600";
  if (n.includes("coconut")) return "https://images.unsplash.com/photo-1588767763179-259f7244907a?w=600";
  if (n.includes("ice cream") || n.includes("sundae")) return "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600";

  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600";
}
