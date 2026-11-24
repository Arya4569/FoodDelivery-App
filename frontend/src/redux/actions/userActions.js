import api from "../../utils/api";
import{
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
clearError 
}from "../slices/userSlice";

export const login = (email, password) => async (dispatch) => {
    try {
        dispatch(userRequest());
        let userObj = null;
        let token = null;

        try {
            const { data } = await api.post("/v1/users/login", { email, password });
            userObj = data.data.user;
            token = data.token;
        } catch (apiError) {
            const status = apiError.response?.status;
            // If backend is offline or on static host (404/405/Network Error), enable demo session
            if (!apiError.response || status === 404 || status === 405) {
                console.warn("Backend offline/unreachable on static host, logging in via demo mode.");
                const savedDemoUser = localStorage.getItem("demo_user");
                userObj = savedDemoUser ? JSON.parse(savedDemoUser) : {
                    _id: "demo_user_1",
                    name: email ? email.split("@")[0] : "Demo Foodie",
                    email: email || "demo@fooddelivery.com",
                    phoneNumber: "9876543210",
                    role: "user",
                    avatar: { url: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }
                };
                token = "demo_jwt_token_" + Date.now();
                localStorage.setItem("demo_user", JSON.stringify(userObj));
            } else {
                throw apiError;
            }
        }

        if (token) {
            localStorage.setItem("token", token);
        }
        dispatch(userSuccess(userObj));
    } catch(error){
        dispatch(
            UserFail(
                error.response?.data?.message || "Login Failed"
            )
        );
    }
};

export const register = (userData) => async (dispatch) => {
    try {
        dispatch(userRequest()); 
        let userObj = null;
        let token = null;

        try {
            const { data } = await api.post("/v1/users/register", userData, {
                headers: { "content-Type": "application/json" }
            });
            userObj = data.data.user;
            token = data.token;
        } catch (apiError) {
            const status = apiError.response?.status;
            // If backend is offline or on static host (404/405/Network Error), enable demo session
            if (!apiError.response || status === 404 || status === 405) {
                console.warn("Backend offline/unreachable on static host, registering in demo mode.");
                const name = (userData instanceof FormData) ? userData.get("name") : (userData.name || "Demo Foodie");
                const email = (userData instanceof FormData) ? userData.get("email") : (userData.email || "demo@fooddelivery.com");
                const phoneNo = (userData instanceof FormData) ? userData.get("phoneNumber") : (userData.phoneNumber || "9876543210");
                userObj = {
                    _id: "demo_user_" + Date.now(),
                    name,
                    email,
                    phoneNumber: phoneNo,
                    role: "user",
                    avatar: { url: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }
                };
                token = "demo_jwt_token_" + Date.now();
                localStorage.setItem("demo_user", JSON.stringify(userObj));
            } else {
                throw apiError;
            }
        }

        if (token) {
            localStorage.setItem("token", token);
        }
        dispatch(userSuccess(userObj));
    } catch(error){
        dispatch(
            UserFail(
                error.response?.data?.message || "Registration Failed"
            )
        );
    }
};

export const loadUser = () => async (dispatch) => {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            // Guest session: silently continue without error toast
            return;
        }
        dispatch(userRequest());
        if (token.startsWith("demo_jwt_token_")) {
            const saved = localStorage.getItem("demo_user");
            if (saved) {
                dispatch(userSuccess(JSON.parse(saved)));
                return;
            }
        }
        try {
            const { data } = await api.get("/v1/users/me");
            if (data?.data?.user) {
                dispatch(userSuccess(data.data.user));
            } else {
                localStorage.removeItem("token");
                dispatch(UserFail(null));
            }
        } catch (apiError) {
            const status = apiError.response?.status;
            if (!apiError.response || status === 404 || status === 405) {
                const saved = localStorage.getItem("demo_user");
                if (saved) {
                    dispatch(userSuccess(JSON.parse(saved)));
                    return;
                }
            }
            localStorage.removeItem("token");
            dispatch(UserFail(null));
        }
    } catch (error) {
        localStorage.removeItem("token");
        dispatch(UserFail(null));
    }
};

export const updateProfile = (userData) => async (dispatch) => {
    try {
        dispatch(updateRequest());
        const { data } = await api.put("/v1/users/me", userData, {
            headers: { 'Content-Type': 'application/json' }
        });
        dispatch(updateSuccess(data.data.user));
        dispatch(userSuccess(data.data.user));
    } catch (error) {
        dispatch(updateFail(error.response?.data?.message || error.message));
    }
}

export const changePassword = (passwordData) => async (dispatch) => {
    try {
        dispatch(updateRequest());
        const { data } = await api.post('/v1/users/change-password', passwordData);
        dispatch(updateSuccess(data.data?.user || true));
        return { success: true };
    } catch (error) {
        const msg = error.response?.data?.message || error.message;
        dispatch(updateFail(msg));
        return { success: false, message: msg };
    }
};

export const logout = () => async (dispatch) => {
    try {
        await api.get("/v1/users/logout");
        localStorage.removeItem("token");
        dispatch(logoutSuccess());
    }catch (error){
        localStorage.removeItem("token");
        dispatch(logoutFail(error.response?.data?.message || error.message));
    }}

export const fetchWishlist = () => async (dispatch) => {
    try {
        dispatch(wishlistRequest());
        const { data } = await api.get("/v1/users/wishlist");
        dispatch(wishlistSuccess(data.wishlist));
    } catch (error) {
        dispatch(wishlistFail(error.response?.data?.message || error.message));
    }
};

export const toggleFavRestaurant = (id) => async (dispatch) => {
    try {
        dispatch(wishlistRequest());
        const { data } = await api.post(`/v1/users/wishlist/restaurant/${id}`);
        dispatch(userSuccess(data.user));
        dispatch(fetchWishlist());
    } catch (error) {
        dispatch(wishlistFail(error.response?.data?.message || error.message));
    }
};

export const toggleFavFoodItem = (id, foodItemData = null) => async (dispatch) => {
    try {
        dispatch(wishlistRequest());
        const { data } = await api.post(
            `/v1/users/wishlist/fooditem/${id}`,
            foodItemData ? { foodItem: foodItemData } : {}
        );
        dispatch(userSuccess(data.user));
        dispatch(fetchWishlist());
    } catch (error) {
        dispatch(wishlistFail(error.response?.data?.message || error.message));
    }
};