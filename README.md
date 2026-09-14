Urbino Help Backend API

A production-oriented RESTful backend for an on-demand home services platform.

The API supports authentication and role-based access, customer and provider workflows, bookings, service and category management, provider availability, agent operations, payments, notifications, reviews, verification workflows, Redis caching, AI-assisted chatbot functionality, Swagger documentation, and Docker-based development.

Built with Node.js, Express.js, PostgreSQL, Redis, OpenAI integration, and Docker.

🚀 Key Capabilities

Authentication & Access Control

JWT-based authentication

Secure password hashing with bcryptjs

Protected routes

Role-based authorization

Customer, Provider, Agent, and Admin workflows

Customer, Provider & Agent Workflows

Customer management

Provider management

Agent management

Provider-agent assignment workflows

Provider profile management

Provider verification workflows

Admin verification workflows

Booking Management

Customer booking workflows

Provider booking workflows

Booking status management

Provider-side booking operations

Agent-related service workflows

Service Management

Category management

Service management

Service discovery

Provider service management

Agent service management

Provider availability management

Payments & Notifications

Payment management

Payment status handling

Payment validation workflows

Duplicate payment prevention logic

Customer notifications

Booking and payment-related notifications

Reviews & Profiles

Reviews and ratings

User profile management

Provider profile management

AI Features

OpenAI service integration

AI-powered chatbot endpoints

Service-related AI assistance

Performance & Caching

Redis integration

Cache key management

Cache utilities

Cache hit/miss handling

Cache invalidation support

Developer Experience

Swagger API documentation

Express validation middleware

Centralized error handling

Docker and Docker Compose support

Nodemon development workflow

🛠 Tech Stack

Technology

Purpose

Node.js

JavaScript runtime

Express.js

Web framework

PostgreSQL

Primary relational database

Redis

Caching and fast data access

JWT

Authentication

bcryptjs

Password hashing

OpenAI SDK

AI service integration

express-validator

Request validation

Swagger UI

Interactive API documentation

Docker

Containerization

Docker Compose

Multi-container orchestration

Nodemon

Development server

📁 Project Structure

The structure below reflects the current codebase.

urbino-help-backend/
│
├── config/
│   ├── cacheKeys.js
│   ├── db.js
│   ├── redis.js
│   └── swagger.js
│
├── constants/
│   ├── bookingStatus.js
│   └── roles.js
│
├── controllers/
│   ├── adminController.js
│   ├── adminVerificationController.js
│   ├── agentController.js
│   ├── agentServiceController.js
│   ├── authController.js
│   ├── bookingController.js
│   ├── categoryController.js
│   ├── chatbotController.js
│   ├── customerController.js
│   ├── notificationController.js
│   ├── paymentController.js
│   ├── profileController.js
│   ├── providerAgentController.js
│   ├── providerAvailabilityController.js
│   ├── providerBookingController.js
│   ├── providerController.js
│   ├── providerProfileController.js
│   ├── providerServiceController.js
│   ├── providerVerificationController.js
│   ├── reviewController.js
│   ├── serviceController.js
│   └── serviceDiscoveryController.js
│
├── middleware/
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
│   ├── roleMiddleware.js
│   └── validationMiddleware.js
│
├── models/
│   ├── adminModel.js
│   ├── adminVerificationModel.js
│   ├── agentModel.js
│   ├── agentServiceModel.js
│   ├── bookingModel.js
│   ├── categoryModel.js
│   ├── customerModel.js
│   ├── notificationModel.js
│   ├── paymentModel.js
│   ├── profileModel.js
│   ├── providerAgentModel.js
│   ├── providerAvailabilityModel.js
│   ├── providerBookingModel.js
│   ├── providerModel.js
│   ├── providerProfileModel.js
│   ├── providerServiceModel.js
│   ├── providerVerificationModel.js
│   ├── reviewModel.js
│   ├── serviceDiscoveryModel.js
│   ├── serviceModel.js
│   └── userModel.js
│
├── routes/
│   ├── adminRoutes.js
│   ├── adminVerificationRoutes.js
│   ├── agentRoutes.js
│   ├── agentServiceRoutes.js
│   ├── authRoutes.js
│   ├── bookingRoutes.js
│   ├── categoryRoutes.js
│   ├── chatbotRoutes.js
│   ├── customerRoutes.js
│   ├── notificationRoutes.js
│   ├── paymentRoutes.js
│   ├── providerAgentRoutes.js
│   ├── providerAvailabilityRoutes.js
│   ├── providerBookingRoutes.js
│   ├── providerProfileRoutes.js
│   ├── providerRoutes.js
│   ├── providerServiceRoutes.js
│   ├── providerVerificationRoutes.js
│   ├── reviewRoutes.js
│   ├── serviceDiscoveryRoutes.js
│   └── serviceRoutes.js
│
├── services/
│   └── aiService.js
│
├── utils/
│   └── cacheUtils.js
│
├── app.js
├── server.js
├── Dockerfile
├── docker-compose.yml
├── database.sql
├── package.json
├── package-lock.json
├── .dockerignore
├── .gitignore
└── README.md

🏗 Architecture

The application follows a layered backend architecture:

Client
   │
   ▼
Express Routes
   │
   ▼
Controllers
   │
   ├── Business Logic
   └── Validation / Authorization
   │
   ▼
Services
   │
   ▼
Models
   │
   ├── PostgreSQL
   └── Redis Cache

This separation helps improve:

Maintainability

Scalability

Separation of concerns

Feature isolation

Easier debugging

Easier future expansion

⚙️ Prerequisites

For local development, install:

Node.js

npm

PostgreSQL

Redis

For containerized development, install:

Docker

Docker Compose

📦 Installation

1. Clone the Repository

git clone <repository-url>
cd urbino-help-backend

2. Install Dependencies

npm install

3. Configure Environment Variables

Create a .env file in the project root.

Example:

PORT=5500

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_database_password
DB_NAME=Urbino_help

JWT_SECRET=your_jwt_secret

OPENAI_API_KEY=your_openai_api_key

REDIS_URL=redis://127.0.0.1:6379

Security note: Never commit .env files, API keys, passwords, or production credentials to source control.

▶️ Running the Application

Production-style Start

npm start

Development Mode

npm run dev

By default, the application runs on:

http://localhost:5500

🐳 Docker Setup

The project includes Docker configuration for running:

Backend API

PostgreSQL

Redis

Build and Start

docker compose up --build

Run in Detached Mode

docker compose up --build -d

Stop Containers

docker compose down

Stop and Remove Volumes

docker compose down -v

Warning: Removing Docker volumes can permanently delete Docker-managed PostgreSQL and Redis data.

📚 API Documentation

Swagger documentation is available when the application is running:

http://localhost:5500/api-docs

Swagger provides interactive documentation for available API endpoints, request parameters, request bodies, authentication requirements, and responses.

🔐 Authentication

The API uses JWT-based authentication.

After a successful login, a JWT token is returned and should be sent with protected requests:

Authorization: Bearer <your_jwt_token>

Authentication and authorization behavior is handled through middleware and role-based access controls.

🗄 Database

PostgreSQL is used as the primary relational database.

Database connectivity is configured through environment variables and the database configuration module.

When using Docker Compose, the backend communicates with PostgreSQL over the Docker network.

⚡ Redis Caching

Redis is integrated as the caching layer.

The project includes:

Redis connection configuration

Cache key management

Cache utility functions

Cache hit/miss handling

Cache invalidation support

When using Docker Compose, Redis runs as a dedicated container.

🤖 AI Integration

The project includes an AI service layer and chatbot-related API endpoints.

The current codebase contains:

services/aiService.js

controllers/chatbotController.js

routes/chatbotRoutes.js

AI credentials should be provided through environment variables rather than hardcoded in source files.

🧪 API Testing

APIs can be tested using:

Swagger UI

Postman or any HTTP client

Before testing database- or cache-dependent endpoints, ensure PostgreSQL and Redis are running.

🔒 Security Practices

The codebase includes or supports:

Password hashing with bcryptjs

JWT authentication

Role-based authorization

Protected routes

Environment-based configuration

Request validation middleware

Centralized error handling

.gitignore and .dockerignore configuration

Recommended Production Hardening

Before production deployment, review and configure:

Strong JWT secrets

Secure database credentials

Secret management

HTTPS/TLS

Rate limiting

Security headers

Logging and monitoring

Database backups

Redis persistence requirements

Container image versioning

📝 Environment Variables

Variable

Description

PORT

Application port

DB_HOST

PostgreSQL host

DB_PORT

PostgreSQL port

DB_USER

PostgreSQL username

DB_PASSWORD

PostgreSQL password

DB_NAME

PostgreSQL database name

JWT_SECRET

Secret used to sign JWT tokens

OPENAI_API_KEY

API key used by the AI integration

REDIS_URL

Redis connection URL

📌 Project Status

The project is actively under development.

The current backend includes authentication, role-based access control, customer/provider/agent workflows, booking management, categories and services, provider availability, notifications, payments, reviews, verification workflows, Redis caching, AI-powered chatbot functionality, Swagger documentation, and Docker-based development support.

📄 License

This repository is intended for organizational and internal development use unless otherwise specified.