const {
createPayment,
getPaymentByBooking,
updatePaymentStatus
} = require("../models/paymentModel");

const {
    getBookingForPayment
} = require("../models/bookingModel");

const {
    createNotification
} = require("../models/notificationModel");

// Create Payment
const createNewPayment = async (req, res) => {
try {

    const { booking_id, amount, payment_method, transaction_id } = req.body;

    if (!booking_id || !amount || !payment_method) {
        return res.status(400).json({
            success: false,
            message: "booking_id, amount and payment_method are required"
        });
    }

    // 2. Amount validation

    if (Number(amount) <= 0) {
        return res.status(400).json({
            success: false,
            message: "Amount must be greater than 0"
        });
    }
    

    // 3. Payment method validation

    const allowedPaymentMethods = ["UPI", "CARD", "CASH"];

    if (!allowedPaymentMethods.includes(payment_method.toUpperCase())) {
        return res.status(400).json({
            success: false,
            message: "Invalid payment method. Use UPI, CARD or CASH"
        });
    }


        // 4. Check booking exists
    //    and belongs to logged-in customer

    const booking = await getBookingForPayment(
        booking_id,
        req.user.id
    );

    if (!booking) {
        return res.status(404).json({
            success: false,
            message: "Booking not found or does not belong to you"
        });
    }


    // 5. Cancelled booking par payment allowed nahi

    if (booking.status === "cancelled") {
        return res.status(400).json({
            success: false,
            message: "Cannot make payment for a cancelled booking"
        });
    }

    // 6. Check duplicate payment

const existingPayment = await getPaymentByBooking(booking_id);

if (existingPayment && existingPayment.payment_status === "successful") {
    return res.status(409).json({
        success: false,
        message: "Payment already completed for this booking"
    });
}

// 7. create payment hai bhai

    const payment = await createPayment(
        booking_id,
        req.user.id,
        amount,
        payment_method,
        transaction_id
    );

    return res.status(201).json({
        success: true,
        message: "Payment created successfully",
        payment
    });

} catch (error) {

    return res.status(500).json({
        success: false,
        message: error.message
    });

}
};


// Get Payment By Booking
const getBookingPayment = async (req, res) => {
try {

    const { booking_id } = req.params;

    const payment = await getPaymentByBooking(booking_id);

    if (!payment) {
        return res.status(404).json({
            success: false,
            message: "Payment not found"
        });
    }

    return res.status(200).json({
        success: true,
        payment
    });

} catch (error) {

    return res.status(500).json({
        success: false,
        message: error.message
    });

}
};


// Update Payment Status

const changePaymentStatus = async (req, res) => {
try {

    const { id } = req.params;

    const { payment_status, transaction_id } = req.body;

    if (!payment_status) {
        return res.status(400).json({
            success: false,
            message: "Payment status is required"
        });
    }

    const allowedStatuses = [
        "pending",
        "successful",
        "failed"
    ];

    if (!allowedStatuses.includes(payment_status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid payment status"
        });
    }

    const payment = await updatePaymentStatus(
        id,
        payment_status,
        transaction_id
    );

    if (!payment) {
        return res.status(404).json({
            success: false,
            message: "Payment not found"
        });
    }

    if (payment_status === "successful") {

        await createNotification(
            payment.customer_id,
            payment.booking_id,
            "Payment Successful",
            "Your payment has been completed successfully.",
            "payment_successful"
        );
    }

    return res.status(200).json({
        success: true,
        message: "Payment status updated successfully",
        payment
    });

} catch (error) {

    return res.status(500).json({
        success: false,
        message: error.message
    });

}
};

module.exports = {
createNewPayment,
getBookingPayment,
changePaymentStatus
};