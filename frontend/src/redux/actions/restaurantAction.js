import api from "../../utils/api"
import { getFilteredRestaurants } from "../../data/restaurantsData"

import{
    getRestaurantsRequest,
    getRestaurantsSuccess,
    getRestaurantsFail,

    createRestaurantRequest,
    createRestaurantSuccess,
    createRestaurantFail,

    deleteRestaurantRequest,
    deleteRestaurantSuccess,
    deleteRestaurantFail,

} from "../slices/restaurantSlice"

//get
export const getRestaurants = (keyword = "") => async (dispatch) => {
  try {
    dispatch(getRestaurantsRequest());

    let url = "/v1/restaurants";

    if (keyword) {
      url += `?keyword=${keyword}`;
    }

    const { data } = await api.get(url);

    dispatch(
      getRestaurantsSuccess({
        restaurants: data.restaurant || [],
        count: data.count || 0,
      })
    );
  } catch (error) {
    console.warn("Backend API unavailable, loading full restaurant dataset:", error.message);
    const list = getFilteredRestaurants(keyword);
    dispatch(
      getRestaurantsSuccess({
        restaurants: list,
        count: list.length,
      })
    );
  }
};

//create
export const createRestaurant = (restaurantData) => async(dispatch)=>{
    try{
       dispatch(createRestaurantRequest())

       const {data} = await api.post("/v1/eats/stores", restaurantData);

       dispatch(createRestaurantSuccess(data.data));

    }
    catch(error){
     dispatch(createRestaurantFail(error.response?.data?.message || error.message))
    }
}

//delete
export const deleteRestaurant = (id) => async(dispatch)=>{
    try{
       dispatch(deleteRestaurantRequest())

      await api.delete(`/v1/eats/stores/${id}`);

       dispatch(deleteRestaurantSuccess(id));

    }
    catch(error){
     dispatch(deleteRestaurantFail(error.response?.data?.message || error.message))
    }
}
