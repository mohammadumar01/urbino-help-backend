# Urbino Help Backend API

A production-ready Backend API for an On-Demand Home Service Platform built with Node.js, Express.js and PostgreSQL.

## Features

- JWT Authentication
- Role-Based Authorization
- Secure Password Hashing using bcrypt
- Customer Booking Management
- Provider Booking Management
- Agent Job Management
- Admin Dashboard
- Provider Profile Management
- Provider Service Management
- Payment Management
- Payment Status Tracking
- Payment Validation
- Duplicate Payment Prevention
- Customer Notifications
- Payment Success Notifications
- Reviews & Ratings
- Pagination
- Search
- Filtering
- Sorting
- Redis Caching
- Cache Hit/Miss Handling
- Cache Invalidation
- Soft Delete
- Agent Restore
- Swagger API Documentation
- Postman API Collection
- RESTful API Architecture


## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Redis
- JWT
- bcryptjs
- Swagger UI
- Postman
- Nodemon


## Project Structure

urbino-help-backend/
│
├── config/
│   ├── db.js
│   ├── redis.js
│   ├── cacheKeys.js
│   └── swagger.js
│
├── constants/
│   └── roles.js
│
├── controllers/
│   ├── authController.js
│   ├── bookingController.js
│   ├── providerController.js
│   ├── agentController.js
│   ├── adminController.js
│   ├── notificationController.js
│   ├── paymentController.js
│   ├── providerProfileController.js
│   ├── providerServiceController.js
│   └── reviewController.js
│
├── middleware/
│   ├── authMiddleware.js
│   └── roleMiddleware.js
│
├── models/
│   ├── userModel.js
│   ├── bookingModel.js
│   ├── notificationModel.js
│   ├── paymentModel.js
│   ├── providerProfileModel.js
│   ├── providerServiceModel.js
│   └── reviewModel.js
│
├── routes/
│   ├── authRoutes.js
│   ├── bookingRoutes.js
│   ├── customerRoutes.js
│   ├── providerRoutes.js
│   ├── agentRoutes.js
│   ├── adminRoutes.js
│   ├── notificationRoutes.js
│   ├── paymentRoutes.js
│   ├── providerProfileRoutes.js
│   ├── providerServiceRoutes.js
│   └── reviewRoutes.js
│
├── utils/
│   └── cacheUtils.js
│
├── app.js
├── server.js
├── package.json
├── package-lock.json
└── .gitignore


## Installation

Clone the repository:

```bash
git clone <repository-url>