import React, { useEffect } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Home from "./Components/Home";
import Header from "./Components/layout/Header";
import Footer from "./Components/layout/Footer";
import Menu from "./Components/Menu";
import Cart from "./cart/Cart";
import Login from "./Components/User/Login";
import Register from "./Components/User/Register";
import Profile from "./Components/User/Profile";
import Wishlist from "./Components/User/Wishlist";
import MyOrders from "./Components/User/MyOrders";
import OrderSuccess from "./cart/OrderSuccess";
import AIChat from "./Components/AIChat";
import store from "./redux/store";
import { loadUser } from "./redux/actions/userActions";
import OwnerDashboard from "./Components/RestaurantOwner/OwnerDashboard";
import DeliveryDashboard from "./Components/DeliveryPartner/DeliveryDashboard";
import { SocketProvider } from "./context/SocketContext";

const ProtectedAdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useSelector((state) => state.user || {});
  if (loading) return <div className="text-center p-5"><div className="spinner-border text-warning"></div></div>;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

const ProtectedOwnerRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useSelector((state) => state.user || {});
  if (loading) return <div className="text-center p-5"><div className="spinner-border text-warning"></div></div>;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  const allowed = ['restaurant_owner', 'owner', 'admin'];
  if (!allowed.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const ProtectedDeliveryRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useSelector((state) => state.user || {});
  if (loading) return <div className="text-center p-5"><div className="spinner-border text-warning"></div></div>;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return children;
};


function App() {
  useEffect(() => {
    store.dispatch(loadUser());
  }, []);


  return (
    <SocketProvider>
      <ToastContainer />
      <Router>
        <div className="App">
          <Header />
          <div className="container container-fluids">
            <Routes>
              <Route path="/" element={<Home />} exact />
              <Route
                path="/v1/restaurants/search/:keyword"
                element={<Home />}
                exact
              />
              <Route path="/restaurants/:id/menus" element={<Menu />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/orders" element={<MyOrders />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/order/:id" element={<OrderSuccess />} />
              <Route path="/success" element={<OrderSuccess />} />
              <Route path="/eats/orders/me/myOrders" element={<MyOrders />} />
              <Route path="/admin" element={<ProtectedAdminRoute><Profile defaultTab="admin" /></ProtectedAdminRoute>} />
              <Route path="/admin/dashboard" element={<ProtectedAdminRoute><Profile defaultTab="admin" /></ProtectedAdminRoute>} />
              <Route path="/owner/dashboard" element={<ProtectedOwnerRoute><OwnerDashboard initialTab="overview" /></ProtectedOwnerRoute>} />
              <Route path="/owner/restaurant" element={<ProtectedOwnerRoute><OwnerDashboard initialTab="restaurant" /></ProtectedOwnerRoute>} />
              <Route path="/owner/menu" element={<ProtectedOwnerRoute><OwnerDashboard initialTab="menu" /></ProtectedOwnerRoute>} />
              <Route path="/owner/orders" element={<ProtectedOwnerRoute><OwnerDashboard initialTab="orders" /></ProtectedOwnerRoute>} />
              <Route path="/delivery/dashboard" element={<ProtectedDeliveryRoute><DeliveryDashboard /></ProtectedDeliveryRoute>} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </Router>
      <AIChat />
    </SocketProvider>
  );
}

export default App;
