const {
createAvailability,
getProviderAvailability,
getAvailableSlots
} = require("../models/providerAvailabilityModel");


// CREATE PROVIDER AVAILABILITY
const createProviderAvailability = async (req, res) => {

try {

    const providerId = req.user.id;

    const {
        day_of_week,
        start_time,
        end_time
    } = req.body;


    if (!day_of_week || !start_time || !end_time) {

        return res.status(400).json({
            success: false,
            message: "day_of_week, start_time and end_time are required"
        });

    }


    const validDays = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
    ];


    if (!validDays.includes(day_of_week)) {

        return res.status(400).json({
            success: false,
            message: "Invalid day_of_week"
        });

    }


    if (start_time >= end_time) {

        return res.status(400).json({
            success: false,
            message: "start_time must be before end_time"
        });

    }


    const availability = await createAvailability(
        providerId,
        day_of_week,
        start_time,
        end_time
    );


    return res.status(201).json({

        success: true,

        message: "Provider availability created successfully",

        availability

    });


} catch (error) {

    console.error(
        "Create Provider Availability Error:",
        error
    );

    return res.status(500).json({

        success: false,

        message: "Internal Server Error"

    });

}

};



// GET PROVIDER AVAILABILITY
const getMyAvailability = async (req, res) => {

try {

    const providerId = req.user.id;


    const availability =
        await getProviderAvailability(providerId);


    return res.status(200).json({

        success: true,

        availability

    });


} catch (error) {

    console.error(
        "Get Provider Availability Error:",
        error
    );

    return res.status(500).json({

        success: false,

        message: "Internal Server Error"

    });

}

};

// GET AVAILABLE SLOTS
const getAvailableProviderSlots = async (req, res) => {

    try {

        const {
            provider_id,
            date
        } = req.query;


        if (!provider_id || !date) {

            return res.status(400).json({
                success: false,
                message: "provider_id and date are required"
            });

        }


        const availabilityData = await getAvailableSlots(
            provider_id,
            date
        );


        if (!availabilityData.length) {

            return res.status(200).json({
                success: true,
                provider_id,
                date,
                slots: []
            });

        }


        const slots = [];


        for (const availability of availabilityData) {

            let startHour = parseInt(
                availability.start_time.split(":")[0]
            );

            const endHour = parseInt(
                availability.end_time.split(":")[0]
            );


            while (startHour < endHour) {

                const slot = `${String(startHour).padStart(2, "0")}:00`;

                const isBooked = availabilityData.some(
                    item =>
                        item.booking_time &&
                        item.booking_time.startsWith(slot)
                );


                if (!isBooked) {
                    slots.push(slot);
                }


                startHour++;
            }
        }


        return res.status(200).json({

            success: true,
            provider_id,
            date,
            slots

        });


    } catch (error) {

        console.error(
            "Get Available Slots Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message: "Internal Server Error"

        });

    }

};

module.exports = {

createProviderAvailability,
getMyAvailability,
getAvailableProviderSlots

};