const notificationModel = require("../models/notificationModel");


// Get My Notifications
const getMyNotifications = async (req, res) => {

try {

    const user_id = req.user.id;

    const notifications =
        await notificationModel.getUserNotifications(user_id);

    return res.status(200).json({
        success: true,
        notifications
    });

} catch (error) {

    console.error("Get Notifications Error:", error);

    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });

}
};


// Mark Notification as Read
const markAsRead = async (req, res) => {

try {

    const user_id = req.user.id;
    const notification_id = req.params.id;

    const notification =
        await notificationModel.markNotificationAsRead(
            notification_id,
            user_id
        );

    if (!notification) {
        return res.status(404).json({
            success: false,
            message: "Notification not found"
        });
    }

    return res.status(200).json({
        success: true,
        message: "Notification marked as read",
        notification
    });

} catch (error) {

    console.error("Mark Notification Read Error:", error);

    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });

}
};

// Get Unread Notification Count
const getUnreadCount = async (req, res) => {
try {

    const user_id = req.user.id;
    const unreadCount =
        await notificationModel.getUnreadNotificationCount(
            user_id
        );

    return res.status(200).json({
        success: true,
        unreadCount
    });

} catch (error) {
    console.error(
        "Get Unread Notification Count Error:",
        error
    );
    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });

}
};

// Mark All Notifications as Read
const markAllAsRead = async (req, res) => {
try {

    const user_id = req.user.id;
    const notifications =
        await notificationModel.markAllNotificationsAsRead(
            user_id
        );

    return res.status(200).json({
        success: true,
        message: "All notifications marked as read",
        notifications
    });

} catch (error) {
    console.error(
        "Mark All Notifications Read Error:",
        error
    );
    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });

}

};

module.exports = {
getMyNotifications,
markAsRead,
getUnreadCount,
markAllAsRead
};