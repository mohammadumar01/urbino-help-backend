# Urbino Help Backend API

A production-oriented RESTful Backend API for an On-Demand Home Service Platform.

The application provides APIs for authentication, role-based access control, service discovery, customer and provider bookings, agent services, notifications, payments, reviews, Redis caching, AI-powered services, and administrative workflows.

Built using Node.js, Express.js, PostgreSQL, Redis, and Docker.

---

## 🚀 Features

### Authentication & Authorization

- JWT-based Authentication
- Role-Based Authorization
- Secure Password Hashing using bcrypt
- Protected API Routes
- Role-based access for Customers, Providers, Agents, and Admins

### Booking Management

- Customer Booking Management
- Provider Booking Management
- Booking Status Management
- Provider Booking Workflow
- Agent Job Management

### Service Management

- Service Discovery
- Provider Service Management
- Provider Profile Management
- Agent Service Management

### AI Features

- AI Service Integration
- AI-powered Chatbot
- Service-related AI Assistance

### Payment Management

- Payment Management
- Payment Status Tracking
- Payment Validation
- Duplicate Payment Prevention
- Payment Success Notifications

### Notifications

- Customer Notifications
- Booking-related Notifications
- Payment Success Notifications

### Reviews & Ratings

- Customer Reviews
- Provider Ratings
- Review Management

### Performance & Caching

- Redis Caching
- Cache Hit/Miss Handling
- Cache Invalidation

### Data Management

- Pagination
- Search
- Filtering
- Sorting
- Soft Delete
- Agent Restore

### API & Developer Tools

- RESTful API Architecture
- Swagger API Documentation
- Postman API Testing Support

### Deployment & Development

- Docker Support
- Docker Compose Support
- PostgreSQL Container
- Redis Container
- Backend Containerization

---

# 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Backend Runtime |
| Express.js | Web Framework |
| PostgreSQL | Relational Database |
| Redis | Caching |
| JWT | Authentication |
| bcryptjs | Password Hashing |
| Swagger UI | API Documentation |
| Docker | Containerization |
| Docker Compose | Multi-container Application Setup |
| Postman | API Testing |
| Nodemon | Development Server |

---

# 📁 Project Structure

```text
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
│   ├── reviewController.js
│   ├── agentServiceController.js
│   ├── chatbotController.js
│   ├── providerBookingController.js
│   └── serviceDiscoveryController.js
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
│   ├── reviewModel.js
│   ├── agentServiceModel.js
│   ├── providerBookingModel.js
│   └── serviceDiscoveryModel.js
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
│   ├── reviewRoutes.js
│   ├── agentServiceRoutes.js
│   ├── chatbotRoutes.js
│   ├── providerBookingRoutes.js
│   └── serviceDiscoveryRoutes.js
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
├── .dockerignore
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
```

---

# ⚙️ Prerequisites

Make sure the following software is installed on your system:

- Node.js
- npm
- PostgreSQL
- Redis

For Docker-based setup:

- Docker
- Docker Compose

---

# 📦 Installation

## 1. Clone the Repository

```bash
git clone <repository-url>
```

Navigate to the project directory:

```bash
cd urbino-help-backend
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file in the root directory.

Example:

```env
PORT=5500

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_database_password
DB_NAME=Urbino_help

JWT_SECRET=your_jwt_secret

OPENAI_API_KEY=your_openai_api_key

REDIS_URL=redis://127.0.0.1:6379
```

> ⚠️ Never commit `.env` files or production secrets to GitHub.

---

# 🐳 Docker Setup

The project can be run using Docker Compose.

The Docker setup includes:

- Backend API Container
- PostgreSQL Container
- Redis Container

## Start the Application

```bash
docker compose up --build
```

Run containers in detached mode:

```bash
docker compose up --build -d
```

---

## Stop the Application

```bash
docker compose down
```

To stop containers and remove volumes:

```bash
docker compose down -v
```

> ⚠️ Removing volumes will delete Docker-managed PostgreSQL and Redis data.

---

# 🌐 Application Access

After starting the application:

```text
Backend API:
http://localhost:5500
```

---

# 📚 API Documentation

Swagger API documentation is available when the application is running.

```text
http://localhost:5500/api-docs
```

The Swagger documentation provides:

- Available API Endpoints
- Request Parameters
- Request Bodies
- Authentication Requirements
- API Responses

---

# 🔐 Authentication

The API uses JWT-based authentication.

After successful login, the API returns a JWT token.

Example response:

```json
{
  "success": true,
  "message": "Login successful",
  "token": "your_jwt_token"
}
```

Protected routes require the token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

---

# 🗄 Database

The application uses PostgreSQL as the primary relational database.

Database configuration is managed using environment variables.

For Docker-based development, PostgreSQL runs as a separate container and communicates with the backend through the Docker network.

---

# ⚡ Redis Caching

Redis is used to improve application performance through caching.

The caching layer supports:

- Cache Hit Handling
- Cache Miss Handling
- Cache Invalidation
- Performance Optimization

When running through Docker Compose, Redis runs as a dedicated container.

---

# 🤖 AI Services

The application includes AI-powered functionality through the service layer.

Current AI-related modules include:

- AI Service Integration
- Chatbot Functionality
- Service Discovery Support

AI credentials should always be stored securely using environment variables.

---

# 🧪 API Testing

The APIs can be tested using:

- Swagger UI
- Postman

Make sure the backend server, PostgreSQL, and Redis services are running before testing dependent APIs.

---

# 🏗 Architecture

The project follows a layered backend architecture:

```text
Client
   │
   ▼
Routes
   │
   ▼
Controllers
   │
   ▼
Services / Business Logic
   │
   ▼
Models
   │
   ▼
PostgreSQL / Redis
```

This separation helps maintain:

- Clean Code Structure
- Scalability
- Maintainability
- Separation of Concerns
- Easier Testing
- Easier Feature Expansion

---

# 🔒 Security Practices

The application follows common backend security practices:

- Password Hashing using bcrypt
- JWT Authentication
- Role-Based Authorization
- Environment-based Configuration
- Secret Management through `.env`
- Protected Routes
- Sensitive Configuration excluded through `.gitignore`

---

# 🚀 Production Considerations

Before deploying to production, ensure that:

- Strong JWT secrets are used
- Production database credentials are configured securely
- Environment variables are managed through a secure secret manager
- Docker images are properly versioned
- Logging and monitoring are configured
- Database backups are enabled
- Redis persistence requirements are reviewed
- API rate limiting and security middleware are configured where required

---

# 👨‍💻 Development

Run the application locally:

```bash
npm install
npm start
```

For development mode, use the project's configured development script if available:

```bash
npm run dev
```

---

# 📝 Environment Variables

| Variable | Description |
|---|---|
| PORT | Application Port |
| DB_HOST | PostgreSQL Host |
| DB_PORT | PostgreSQL Port |
| DB_USER | PostgreSQL Username |
| DB_PASSWORD | PostgreSQL Password |
| DB_NAME | PostgreSQL Database Name |
| JWT_SECRET | Secret Key for JWT Authentication |
| OPENAI_API_KEY | OpenAI API Key |
| REDIS_URL | Redis Connection URL |

---

# 📌 Project Status

The project is actively under development.

The backend currently includes authentication, authorization, booking workflows, provider workflows, agent services, service discovery, notifications, payments, reviews, Redis caching, AI-powered features, Swagger documentation, and Docker-based development support.

---

# 📄 License

This project is intended for internal development and organizational use unless otherwise specified.