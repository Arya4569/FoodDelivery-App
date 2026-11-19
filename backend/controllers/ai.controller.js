const catchAsync = require("../middlewares/catchAsyncErrors");
const aiService = require("../services/ai.service")
const FoodItem = require("../models/fooditem");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const Restaurant = require("../models/restaurant");
const {analyzeReviewsWithAI}= require("../services/aiReviewAnalyzer")
const axios = require("axios");

exports.generateFoodAI = catchAsync(async (req,res) =>{
    const {name,category,spiceLevel,price} = req.body;
    if(!name || !category || !spiceLevel || !price){
        return res.status(400).json({
            success:false,
            message:"name, category,spiceLevel and price are required"
        })
    }

    const aiData = await aiService.generateDishDescription({
        name,
        category,spiceLevel,
        price
    })

    res.status(200).json({
        success:true,
        data:aiData,
    })
}
)

exports.generateAndSaveFoodAI = catchAsync(async(req,res) =>{
    const {foodId} = req.params;

    const food = await FoodItem.findById(foodId);
    if(!food){
        return res.status(404).json({
            success:false,
            message:"Food item not found"
        })
    }

    const aiData = await aiService.generateDishDescription({
        name: food.name,
        category:food.category || "Veg",
        spiceLevel:food.spiceLevel || "Medium",
        price:food.price
    })

    food.aiDescription = aiData.description;
    food.aiTags = aiData.tags;
    food.aiAllergens = aiData.allergens;
    food.aiServes = aiData.serves;
    food.aiBestFor = aiData.bestFor;
    await food.save();
    res.status(200).json({
        success:true,
        message:"AI metadata generated and saved",
        data:aiData,
    })
})

exports.analyzeRestaurantReviews = catchAsync(async(req,res) =>{
    try{
          const {id} = req.params;
          const restaurant = await Restaurant.findById(id);

          if(!restaurant) {
            return res.status(404).json({message:"Restaurant not found"})
          }

          if(!restaurant.reviews.length){
            return res.status(400).json({message:"No reviews to analyze"})
          }

          const aiData = await analyzeReviewsWithAI(restaurant.reviews);

          console.log("AI DATA:", aiData);

          restaurant.reviewSentiment = aiData.sentiment;
          restaurant.reviewSummaryBullets = aiData.summaryBullets;
          restaurant.reviewTopMentions = aiData.topMentions;

          await restaurant.save();
          res.status(200).json({success:true, aiData})
    }catch(error){
        res.status(500).json({message:error.message})
    }
})



exports.addReview = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { name, rating, Comment } = req.body;

  const restaurant = await Restaurant.findById(id);

  if (!restaurant) {
    return res.status(404).json({
      success: false,
      message: "Restaurant not found",
    });
  }

  // Add Review
  restaurant.reviews.push({
    name,
    rating,
    Comment,
  });

  // Update Review Count
  restaurant.numOfReviews =
    restaurant.reviews.length;

  // Update Average Rating
  const totalRatings =
    restaurant.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );

  restaurant.ratings =
    totalRatings / restaurant.reviews.length;

  // AI Review Analysis
  try {
    const aiData = await analyzeReviewsWithAI(
      restaurant.reviews
    );

    restaurant.reviewSentiment =
      aiData.sentiment;

    restaurant.reviewSummaryBullets =
      aiData.summaryBullets;

    restaurant.reviewTopMentions =
      aiData.topMentions;
  } catch (error) {
    console.log(
      "AI Analysis Failed:",
      error.message
    );
  }

  await restaurant.save();

  res.status(200).json({
    success: true,
    message: "Review Added Successfully",
    restaurant,
  });
});

exports.chatWithFoodAI = catchAsync(async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const prompt = `
You are Foodie AI.

You are an intelligent assistant inside a food delivery application.

You must answer ONLY food delivery related questions.

You can:

• Recommend dishes
• Recommend restaurants
• Suggest healthy meals
• Suggest vegetarian food
• Suggest non-vegetarian food
• Suggest desserts
• Suggest breakfast/lunch/dinner
• Suggest food under a budget
• Explain ingredients
• Recommend spicy food
• Recommend low calorie meals
• Help users decide what to order

If the user asks something unrelated to food delivery,
politely reply:

"I'm designed to help with food ordering, restaurants and dishes."

Keep answers short, friendly and professional.

User: ${message}
`;

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({
      success: true,
      reply: response.data.choices[0].message.content,
    });
  } catch (error) {
    console.log(error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "AI Error",
    });
  }
  
});