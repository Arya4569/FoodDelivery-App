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
        const { data } = await api.post("/v1/users/login", { email, password });
        if (data.token) {
            localStorage.setItem("token", data.token);
        }
        dispatch(userSuccess(data.data.user));
    }catch(error){

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
        const {data} = await api.post("/v1/users/register", userData,{
        headers :
        {"content-Type":"application/json"}
        })
        if (data.token) {
            localStorage.setItem("token", data.token);
        }
        dispatch(userSuccess(data.data.user));
    }catch(error){

dispatch(
UserFail(
error.response?.data?.message || "Registration Failed"
)
);

}
}

export const loadUser = () => async (dispatch) => {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            // Guest session: silently continue without error toast
            return;
        }
        dispatch(userRequest());
        const { data } = await api.get("/v1/users/me");
        if (data?.data?.user) {
            dispatch(userSuccess(data.data.user));
        } else {
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

export const toggleFavFoodItem = (id) => async (dispatch) => {
    try {
        dispatch(wishlistRequest());
        const { data } = await api.post(`/v1/users/wishlist/fooditem/${id}`);
        dispatch(userSuccess(data.user));
        dispatch(fetchWishlist());
    } catch (error) {
        dispatch(wishlistFail(error.response?.data?.message || error.message));
    }
};