import api from '../../utils/api';
import {
    cartRequest,
    cartSuccess,
    cartFail,
    addItemDirect,
    updateItemQtyDirect,
    removeItemDirect,
    updatecartsuccess,
    removeCartsuccess,
    clearCart
} from '../slices/cartSlice';

// Fetch cart from API (if authenticated), falls back gracefully to localStorage
export const fetchCart = () => async (dispatch, getState) => {
    try {
        const { user, isAuthenticated } = getState().user || {};
        if (!isAuthenticated || !user?._id) {
            // Guest user: cart is handled via localStorage state in slice
            return;
        }

        dispatch(cartRequest());
        const { data } = await api.get("/v1/users/cart");
        dispatch(cartSuccess(data));
    } catch (error) {
        // Always reset loading flag so UI never hangs
        dispatch(cartFail(error.response?.data?.message || error.message));
        console.warn("Backend cart sync skipped:", error.message);
    }
};

// Add item to cart with instant local update + optional background sync
export const addItemToCart = (foodItemId, restaurantId, quantity = 1, foodItemObj = null, restaurantObj = null) => async (dispatch, getState) => {
    try {
        // 1. Immediately update UI locally
        dispatch(addItemDirect({
            foodItem: foodItemObj || { _id: foodItemId },
            restaurant: restaurantObj || { _id: restaurantId },
            quantity: quantity
        }));

        // 2. Background sync if user is logged in
        const { user, isAuthenticated } = getState().user || {};
        if (isAuthenticated && user?._id) {
            try {
                const { data } = await api.post(`/v1/users/cart/add-to-cart`, {
                    userId: user._id,
                    foodItemId,
                    restaurantId,
                    quantity
                });
                if (data?.cart) {
                    dispatch(cartSuccess(data.cart));
                }
            } catch (apiErr) {
                console.warn("Cart API background sync notice:", apiErr.message);
            }
        }
    } catch (error) {
        console.error("Cart error:", error);
    }
};

// Update item quantity with instant local update + optional background sync
export const updateCartItem = (foodItemId, quantity) => async (dispatch, getState) => {
    try {
        // 1. Instant local update
        dispatch(updateItemQtyDirect({ foodItemId, quantity }));

        // 2. Background sync if logged in
        const { user, isAuthenticated } = getState().user || {};
        if (isAuthenticated && user?._id) {
            try {
                const { data } = await api.post(`/v1/users/cart/update-cart-item`, {
                    userId: user._id,
                    foodItemId,
                    quantity
                });
                if (data?.cart) {
                    dispatch(updatecartsuccess(data.cart));
                }
            } catch (apiErr) {
                console.warn("Cart update API sync notice:", apiErr.message);
            }
        }
    } catch (error) {
        console.error("Cart error:", error);
    }
};

// Remove item from cart with instant local update + optional background sync
export const removeCartItem = (foodItemId) => async (dispatch, getState) => {
    try {
        // 1. Instant local update
        dispatch(removeItemDirect(foodItemId));

        // 2. Background sync if logged in
        const { user, isAuthenticated } = getState().user || {};
        if (isAuthenticated && user?._id) {
            try {
                const { data } = await api.delete(`/v1/users/cart/delete-cart-item`, {
                    data: {
                        userId: user._id,
                        foodItemId
                    }
                });
                if (data) {
                    dispatch(removeCartsuccess(data));
                }
            } catch (apiErr) {
                console.warn("Cart remove API sync notice:", apiErr.message);
            }
        }
    } catch (error) {
        console.error("Cart error:", error);
    }
};

// Clear entire cart locally and sync with backend
export const clearEntireCart = () => async (dispatch, getState) => {
    try {
        dispatch(clearCart());
        const { user, isAuthenticated } = getState().user || {};
        if (isAuthenticated && user?._id) {
            try {
                await api.delete("/v1/users/cart/clear");
            } catch (err) {
                console.warn("Cart clear backend sync notice:", err.message);
            }
        }
    } catch (error) {
        console.error("Clear cart error:", error);
    }
};
