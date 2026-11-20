import api from "../../utils/api"
import { getFilteredMockRestaurants } from "../../mock/mockData"

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
        restaurants: data.restaurant,
        count: data.count,
      })
    );
  } catch (error) {
    console.warn("Backend unavailable, loading offline fallback restaurants:", error.message);
    const fallbackRestaurants = getFilteredMockRestaurants(keyword);
    dispatch(
      getRestaurantsSuccess({
        restaurants: fallbackRestaurants,
        count: fallbackRestaurants.length,
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
