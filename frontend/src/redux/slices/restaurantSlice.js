import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    restaurants: [],
    allRestaurants: [],
    count: 0,
    loading: false,
    error: null,
    showVegOnly: false,
    pureVegRestaurantsCount: 0,
    creating: false,
    createError: null,
    deleting: false,
    deleteError: null
};

const restaurantSlice = createSlice({
    name: "restaurants",
    initialState,
    reducers: {
        // get
        getRestaurantsRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        getRestaurantsSuccess: (state, action) => {
            state.loading = false;
            const list = action.payload.restaurants || [];
            state.restaurants = list;
            state.allRestaurants = list;
            state.count = action.payload.count !== undefined ? action.payload.count : list.length;
            state.pureVegRestaurantsCount = list.filter((r) => r.isVeg).length;
        },
        getRestaurantsFail: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // create
        createRestaurantRequest: (state) => {
            state.creating = true;
        },
        createRestaurantSuccess: (state, action) => {
            state.creating = false;
            state.restaurants.push(action.payload);
            state.allRestaurants.push(action.payload);
            state.count += 1;
            if (action.payload.isVeg) {
                state.pureVegRestaurantsCount += 1;
            }
        },
        createRestaurantFail: (state, action) => {
            state.creating = false;
            state.createError = action.payload;
        },

        // delete
        deleteRestaurantRequest: (state) => {
            state.deleting = true;
        },
        deleteRestaurantSuccess: (state, action) => {
            state.deleting = false;
            state.restaurants = state.restaurants.filter(
                (restaurant) => restaurant._id !== action.payload
            );
            state.allRestaurants = state.allRestaurants.filter(
                (restaurant) => restaurant._id !== action.payload
            );
            state.count -= 1;
        },
        deleteRestaurantFail: (state, action) => {
            state.deleting = false;
            state.deleteError = action.payload;
        },

        // sort by ratings
        sortByRatings: (state) => {
            state.restaurants.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
        },

        // sort by reviews
        sortByReviews: (state) => {
            state.restaurants.sort((a, b) => (b.numOfReviews || 0) - (a.numOfReviews || 0));
        },

        // sort by fast delivery (mock distance/time estimation)
        sortByFastDelivery: (state) => {
            state.restaurants.sort((a, b) => (a.deliveryTime || 30) - (b.deliveryTime || 30));
        },

        // toggle pure veg
        toggleVegOnly: (state) => {
            state.showVegOnly = !state.showVegOnly;
        },

        clearError: (state) => {
            state.error = null;
        }
    }
});

export const {
    getRestaurantsRequest,
    getRestaurantsSuccess,
    getRestaurantsFail,
    createRestaurantRequest,
    createRestaurantSuccess,
    createRestaurantFail,
    deleteRestaurantRequest,
    deleteRestaurantSuccess,
    deleteRestaurantFail,
    sortByRatings,
    sortByReviews,
    sortByFastDelivery,
    toggleVegOnly,
    clearError
} = restaurantSlice.actions;

export default restaurantSlice.reducer;
