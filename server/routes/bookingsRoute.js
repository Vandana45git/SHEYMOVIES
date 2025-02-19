const router = require("express").Router();
const stripe = require("stripe")(process.env.stripe_key);
const authMiddleware = require("../middlewares/authMiddleware");
const Booking = require("../models/bookingModel");
const Show = require("../models/showModel");

// make payment
router.post("/make-payment", authMiddleware, async (req, res) => {
    try {
        const { token, amount } = req.body;

         // create a customer
        const customer = await stripe.customers.create({
            email: token.email,
            source: token.id,
          });

         // create a charge
          const charge = await stripe.charges.create({
            amount: amount,
            currency: "usd",
            customer: customer.id,
            receipt_email: token.email,
            description: "Purchased the movie ticket",
          },
          {
            idempotencyKey : Math.random().toString(36).substring(7),
            

          }
        );
        const transactionId = charge.id;

        res.send({
            success: true,
            message: "Payment successful",
            data: transactionId,
          });
      
    } catch (error) {
        res.send({
            success: false,
            message: error.message,
          });   
    }
});

// book shows
router.post("/book-show", authMiddleware, async (req, res) =>{
  try {
     // save booking
     const newBooking = new Booking(req.body);
     await newBooking.save();

     const show = await Show.findById(req.body.show);
      // update seats
    await Show.findByIdAndUpdate(req.body.show, {
      bookedSeats: [...show.bookedSeats, ...req.body.seats],
    });

     res.send({
      success: true,
      message: "Show booked successfully",
      data: newBooking,
    });
    
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// get all bookings by user
router.get("/get-bookings", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.body.userId })
      .populate("show")
      .populate({
        path: "show",
        populate: {
          path: "movie",
          model: "movies",
        },
      })
      .populate("user")
      .populate({
        path: "show",
        populate: {
          path: "theatre",
          model: "theatres",
        },
      });

    res.send({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings,
    });
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;