import restaurantsJson from '../../../backend/restaurants.json';
import sampleMenusJson from '../../../backend/sampleMenus.json';

export const allRestaurants = restaurantsJson.restaurant || [];
export const allMenus = sampleMenusJson || {};

// Flattened list of food items for search fallback
export const allFoodItems = Object.keys(allMenus).flatMap((rId) => {
  const restaurant = allRestaurants.find((r) => r._id === rId) || { _id: rId, name: "Restaurant" };
  return (allMenus[rId] || []).flatMap((menu) =>
    (menu.foodItems || []).map((item) => ({
      ...item,
      restaurant,
      menu: { _id: menu._id, name: menu.name },
      restaurantName: restaurant.name,
      category: menu.name || "General"
    }))
  );
});

export const getFilteredRestaurants = (keyword = "") => {
  if (!keyword || !keyword.trim()) return allRestaurants;
  const kw = keyword.toLowerCase().trim();
  return allRestaurants.filter((r) => {
    const nameMatch = r.name && r.name.toLowerCase().includes(kw);
    const cuisineMatch = r.cuisines && r.cuisines.toLowerCase().includes(kw);
    const addressMatch = r.address && r.address.toLowerCase().includes(kw);
    const tagsMatch = Array.isArray(r.tags) && r.tags.some((t) => t.toLowerCase().includes(kw));
    return nameMatch || cuisineMatch || addressMatch || tagsMatch;
  });
};

export const getFilteredFoodItems = (params = {}) => {
  let items = [...allFoodItems];

  if (params.keyword && params.keyword.trim()) {
    const kw = params.keyword.toLowerCase().trim();
    items = items.filter(
      (f) =>
        (f.name && f.name.toLowerCase().includes(kw)) ||
        (f.description && f.description.toLowerCase().includes(kw)) ||
        (f.restaurant?.name && f.restaurant.name.toLowerCase().includes(kw))
    );
  }

  if (params.category && params.category.toLowerCase() !== "all") {
    const cat = params.category.toLowerCase().trim();
    items = items.filter(
      (f) =>
        (f.menu?.name && f.menu.name.toLowerCase().includes(cat)) ||
        (f.name && f.name.toLowerCase().includes(cat)) ||
        (f.category && f.category.toLowerCase().includes(cat))
    );
  }

  if (params.isVeg) {
    items = items.filter((f) => f.isVeg);
  }

  if (params.minPrice) {
    items = items.filter((f) => f.price >= Number(params.minPrice));
  }

  if (params.maxPrice) {
    items = items.filter((f) => f.price <= Number(params.maxPrice));
  }

  if (params.minRating) {
    items = items.filter((f) => (f.ratings || 0) >= Number(params.minRating));
  }

  if (params.sortBy === "price_asc") {
    items.sort((a, b) => a.price - b.price);
  } else if (params.sortBy === "price_desc") {
    items.sort((a, b) => b.price - a.price);
  } else if (params.sortBy === "rating_desc") {
    items.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
  }

  return items;
};
