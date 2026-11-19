const path = require("path");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../config/config.env") });

const stripe = process.env.STRIPE_SECRET_KEY ? require("stripe")(process.env.STRIPE_SECRET_KEY) : null;

// Process Payment API -> Real Stripe Checkout Session
exports.processPayment = catchAsyncErrors(async (req, res, next) => {
    console.log("Payment Process Request Body:", req.body);

    if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No items provided for payment process",
        });
    }

    const userEmail = req.body.email || req.user?.email || "customer@example.com";

    try {
        if (!stripe) {
            return res.status(400).json({
                success: false,
                message: "Stripe payment is not configured. Please choose Cash on Delivery.",
            });
        }

        const lineItems = req.body.items.map((item) => {
            const food = item.foodItem || item;
            const name = food.name || "Food Item";
            const price = Number(food.price) > 0 ? Number(food.price) : 100;
            const rawImg = food.image?.[0]?.url || food.images?.[0]?.url || "";
            const imgUrl = (typeof rawImg === "string" && rawImg.startsWith("http"))
                ? rawImg
                : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c";

            return {
                price_data: {
                    currency: "inr",
                    product_data: {
                        name: name,
                        images: [imgUrl],
                    },
                    unit_amount: Math.max(Math.round(price * 100), 100),
                },
                quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
            };
        });

        // Add Delivery Fee if total is <= 199
        const itemTotal = req.body.items.reduce((acc, i) => {
            const p = Number(i.foodItem?.price || i.price || 0);
            return acc + p * (i.quantity || 1);
        }, 0);
        const deliveryFee = itemTotal > 199 ? 0 : 35;

        const session = await stripe.checkout.sessions.create({
            customer_email: userEmail,
            phone_number_collection: {
                enabled: true,
            },
            line_items: lineItems,
            mode: "payment",
            shipping_address_collection: {
                allowed_countries: ["IN"],
            },
            shipping_options: [
                {
                    shipping_rate_data: {
                        display_name: deliveryFee === 0 ? "Free Delivery (> ₹199)" : "Standard Delivery",
                        type: "fixed_amount",
                        fixed_amount: {
                            amount: deliveryFee * 100,
                            currency: "inr",
                        },
                    },
                },
            ],
            success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/cart`,
        });

        return res.status(200).json({
            success: true,
            url: session.url,
        });
    } catch (err) {
        console.error("PAYMENT PROCESS STRIPE ERROR:", err.message);
        return res.status(400).json({
            success: false,
            message: `Stripe Payment Error: ${err.message}. You can also use Cash on Delivery.`,
        });
    }
});

// Send Stripe Publishable Key
exports.sendStripeApiKey = catchAsyncErrors(async (req, res, next) => {
    res.status(200).json({
        success: true,
        stripeApiKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
});
