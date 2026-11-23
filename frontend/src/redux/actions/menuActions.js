import API from "../../utils/api";
import { allMenus, allFoodItems } from "../../data/restaurantsData";

import {
       getMenusRequest,
       getMenusSuccess,
       getMenusFail,

       createMenuRequest,
       createMenuSuccess,
       createMenuFail,

   addItemRequest,
   addItemSuccess,
   addItemFail,
   clearMenuErrors
 } from "../slices/menuSlice";

 // GET MENUS
 export const getMenus = (id) => async (dispatch) => {
   try {
     dispatch(getMenusRequest());

    const response = await API.get(
       `/v1/restaurants/${id}/menus`
     );

    dispatch(getMenusSuccess(response.data.data || []));
   } catch (error) {
     console.warn("Backend API unreachable, loading fallback menu for restaurant:", id);
     const fallback = allMenus[id] || [
       {
         _id: `menu_${id}`,
         name: "Recommended Specials",
         restaurant: id,
         foodItems: allFoodItems.filter(f => (f.restaurant?._id || f.restaurant) === id).slice(0, 4)
       }
     ];
     dispatch(getMenusSuccess(fallback));
   }
 };

 // CREATE MENU
 export const createMenu =
   ({ restaurantId, category }) =>
   async (dispatch) => {
     try {
       dispatch(createMenuRequest());

       const body = {
         restaurant: restaurantId,
         menu: [{ category, items: [] }],
       };

       const { data } = await API.post(
         `/v1/restaurants/${restaurantId}/menus`,
         body
       );

       dispatch(createMenuSuccess(data.data));
     } catch (error) {
       dispatch(
         createMenuFail(
           error.response?.data?.message || error.message
         )
       );
     }
   };

 // ADD ITEM
 export const addItemToMenu =
   ({ menuId, category, foodItemId, restaurantId }) =>
   async (dispatch) => {
     try {
       dispatch(addItemRequest());

       const body = {
         category,
         foodItemId,
       };

       const { data } = await API.patch(
         `/v1/restaurants/${restaurantId}/menus/${menuId}/addItem`,
         body
       );

       dispatch(addItemSuccess(data.data));
     } catch (error) {
       dispatch(
         addItemFail(
           error.response?.data?.message || error.message
         )
       );
     }
   };