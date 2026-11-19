import { createSlice } from '@reduxjs/toolkit';

// Sanitize cart items: strip out any dead / orphaned / price-0 / placeholder items
export const sanitizeCartItems = (items) => {
    if (!Array.isArray(items)) return [];
    return items
        .filter((item) => {
            if (!item) return false;
            const food = item.foodItem || item;
            const price = Number(food.price || item.price || 0);
            const name = food.name || item.name;
            // Never allow dead items with 0 price or generic dummy placeholder with 0 price
            if (!name || price <= 0) return false;
            if (name === "Delicious Dish" && price <= 0) return false;
            return true;
        })
        .map((item) => {
            const food = item.foodItem || item;
            const price = Number(food.price || item.price || 0);
            const id = food._id || item._id;
            return {
                _id: item._id || ("cart_" + id),
                foodItem: {
                    _id: id,
                    name: food.name,
                    price: price,
                    image: food.image || food.images || [],
                    images: food.images || food.image || [],
                    isVeg: food.isVeg !== undefined ? food.isVeg : true,
                    stock: food.stock || 100,
                    description: food.description || ""
                },
                quantity: Math.max(1, Number(item.quantity) || 1)
            };
        });
};

// Safe load from localStorage
const loadInitialCart = () => {
    try {
        const stored = localStorage.getItem('fooddelivery_cart');
        if (stored) {
            const parsed = JSON.parse(stored);
            const validItems = sanitizeCartItems(parsed.cartItems || []);
            return {
                cartItems: validItems,
                restaurant: validItems.length > 0 ? (parsed.restaurant || {}) : {}
            };
        }
    } catch (e) {
        console.error("Error loading cart from storage:", e);
    }
    return { cartItems: [], restaurant: {} };
};

const saved = loadInitialCart();

const initialState = {
    cartItems: saved.cartItems,
    restaurant: saved.restaurant,
    loading: false,
    error: null,
    deliveryInfo: null
};

// Helper to save to localStorage
const syncStorage = (state) => {
    try {
        localStorage.setItem('fooddelivery_cart', JSON.stringify({
            cartItems: state.cartItems,
            restaurant: state.restaurant
        }));
    } catch (e) {
        console.error("Error saving cart to storage:", e);
    }
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        cartRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        cartSuccess: (state, action) => {
            state.loading = false;
            const payloadData = action.payload?.data || action.payload?.cart || action.payload || {};
            if (Array.isArray(payloadData.items)) {
                const validItems = sanitizeCartItems(payloadData.items);
                state.cartItems = validItems;
            }
            if (payloadData.restaurant) {
                state.restaurant = payloadData.restaurant;
            } else if (state.cartItems.length === 0) {
                state.restaurant = {};
            }
            syncStorage(state);
        },
        cartFail: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Fast direct local updates for instant smooth UI
        addItemDirect: (state, action) => {
            const { foodItem, restaurant, quantity = 1 } = action.payload;
            if (!foodItem) return;

            const foodId = foodItem._id || foodItem.id;
            const price = Number(foodItem.price || 0);
            if (price <= 0) return; // Ignore invalid or 0-price items

            const existingIndex = state.cartItems.findIndex((item) => {
                const itemFoodId = item.foodItem?._id || item.foodItem?.id || item._id;
                return itemFoodId === foodId;
            });

            if (existingIndex >= 0) {
                state.cartItems[existingIndex].quantity += quantity;
            } else {
                state.cartItems.push({
                    _id: "cart_item_" + Date.now(),
                    foodItem: {
                        _id: foodId,
                        name: foodItem.name,
                        price: price,
                        image: foodItem.image || foodItem.images || [],
                        images: foodItem.images || foodItem.image || [],
                        isVeg: foodItem.isVeg !== undefined ? foodItem.isVeg : true,
                        stock: foodItem.stock || 100,
                        description: foodItem.description || ""
                    },
                    quantity: quantity
                });
            }

            if (restaurant && (restaurant._id || restaurant.name)) {
                state.restaurant = restaurant;
            }

            state.loading = false;
            syncStorage(state);
        },
        updateItemQtyDirect: (state, action) => {
            const { foodItemId, quantity } = action.payload;
            const existingIndex = state.cartItems.findIndex((item) => {
                const itemFoodId = item.foodItem?._id || item.foodItem?.id || item._id;
                return itemFoodId === foodItemId;
            });

            if (existingIndex >= 0) {
                if (quantity <= 0) {
                    state.cartItems.splice(existingIndex, 1);
                } else {
                    state.cartItems[existingIndex].quantity = quantity;
                }
            }
            if (state.cartItems.length === 0) {
                state.restaurant = {};
            }
            syncStorage(state);
        },
        removeItemDirect: (state, action) => {
            const foodItemId = action.payload;
            state.cartItems = state.cartItems.filter((item) => {
                const itemFoodId = item.foodItem?._id || item.foodItem?.id || item._id;
                return itemFoodId !== foodItemId;
            });
            if (state.cartItems.length === 0) {
                state.restaurant = {};
            }
            syncStorage(state);
        },
        updatecartsuccess: (state, action) => {
            const payloadData = action.payload?.data || action.payload?.cart || action.payload || {};
            if (Array.isArray(payloadData.items)) {
                state.cartItems = sanitizeCartItems(payloadData.items);
            }
            if (payloadData.restaurant) {
                state.restaurant = payloadData.restaurant;
            }
            syncStorage(state);
        },
        removeCartsuccess: (state, action) => {
            const payloadData = action.payload?.data || action.payload?.cart || action.payload || {};
            if (Array.isArray(payloadData.items)) {
                state.cartItems = sanitizeCartItems(payloadData.items);
            }
            if (state.cartItems.length === 0) {
                state.restaurant = {};
            }
            syncStorage(state);
        },
        clearCart: (state) => {
            state.cartItems = [];
            state.restaurant = {};
            syncStorage(state);
        },
        clearError: (state) => {
            state.error = null;
        },
        saveDelivryInfo: (state, action) => {
            state.deliveryInfo = action.payload;
        }
    }
});

export const {
    cartRequest,
    cartSuccess,
    cartFail,
    addItemDirect,
    updateItemQtyDirect,
    removeItemDirect,
    updatecartsuccess,
    removeCartsuccess,
    clearCart,
    clearError,
    saveDelivryInfo
} = cartSlice.actions;

export default cartSlice.reducer;
