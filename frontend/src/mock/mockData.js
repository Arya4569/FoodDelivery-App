import restaurantsData from './restaurants.json';
import sampleMenusData from './sampleMenus.json';

export const mockRestaurants = restaurantsData.restaurant || [];
export const mockMenus = sampleMenusData || {};

// Flatten all food items from sampleMenus
export const allMockFoodItems = Object.values(mockMenus).flatMap(menuList =>
  (menuList || []).flatMap(menu =>
    (menu.foodItems || []).map(item => ({
      ...item,
      restaurantName: mockRestaurants.find(r => r._id === item.restaurant)?.name || 'Restaurant',
      category: menu.name || 'General'
    }))
  )
);

export const getFilteredMockRestaurants = (keyword = "") => {
  if (!keyword || !keyword.trim()) return mockRestaurants;
  const kw = keyword.toLowerCase().trim();
  return mockRestaurants.filter(r =>
    r.name.toLowerCase().includes(kw) ||
    r.address.toLowerCase().includes(kw)
  );
};

export const getFilteredMockFoodItems = (params = {}) => {
  let items = [...allMockFoodItems];

  if (params.keyword && params.keyword.trim()) {
    const kw = params.keyword.toLowerCase().trim();
    items = items.filter(f =>
      f.name.toLowerCase().includes(kw) ||
      (f.description && f.description.toLowerCase().includes(kw))
    );
  }

  if (params.category && params.category !== 'all') {
    const cat = params.category.toLowerCase();
    items = items.filter(f => (f.category || '').toLowerCase().includes(cat));
  }

  if (params.maxPrice) {
    items = items.filter(f => f.price <= Number(params.maxPrice));
  }

  if (params.minPrice) {
    items = items.filter(f => f.price >= Number(params.minPrice));
  }

  if (params.sortBy === 'rating_desc') {
    items.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
  } else if (params.sortBy === 'price_asc') {
    items.sort((a, b) => a.price - b.price);
  } else if (params.sortBy === 'price_desc') {
    items.sort((a, b) => b.price - a.price);
  }

  return items;
};
