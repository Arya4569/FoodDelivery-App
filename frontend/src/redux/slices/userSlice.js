import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  isUpdating: false,
  isUpdated: false,
  message: null,
  wishlist: {
    restaurants: [],
    foodItems: [],
    loading: false,
    error: null
  }
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    userRequest: (state) => {
      state.loading = true;
      state.error = null;
    },

    userSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },

    UserFail: (state, action) => {
      state.loading = false;
      state.user = null;
      state.isAuthenticated = false;
      state.error = action.payload;
    },

    logoutSuccess: (state) => {
      state.loading = false;
      state.user = null;
      state.isAuthenticated = false;
      state.wishlist = { restaurants: [], foodItems: [], loading: false, error: null };
    },

    logoutFail: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    updateRequest: (state) => {
      state.loading = true;
    },

    updateSuccess: (state, action) => {
      state.loading = false;
      state.isUpdated = true;
      // If a user object was returned, update the user state too
      if (action.payload && action.payload._id) {
        state.user = action.payload;
      }
    },

    updateFail: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    updateReset: (state) => {
      state.isUpdated = false;
    },

    wishlistRequest: (state) => {
      state.wishlist.loading = true;
      state.wishlist.error = null;
    },

    wishlistSuccess: (state, action) => {
      state.wishlist.loading = false;
      state.wishlist.restaurants = action.payload.restaurants || [];
      state.wishlist.foodItems = action.payload.foodItems || [];
      state.wishlist.error = null;
    },

    wishlistFail: (state, action) => {
      state.wishlist.loading = false;
      state.wishlist.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
      state.wishlist.error = null;
    },
  },
});

export const {
  userRequest,
  userSuccess,
  UserFail,
  logoutSuccess,
  logoutFail,
  updateRequest,
  updateSuccess,
  updateFail,
  updateReset,
  wishlistRequest,
  wishlistSuccess,
  wishlistFail,
  clearError,
} = userSlice.actions;

export default userSlice.reducer;



