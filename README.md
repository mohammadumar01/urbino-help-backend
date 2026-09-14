# Urbino Help Backend API

A production-oriented RESTful Backend API for an On-Demand Home Service Platform.

The application provides backend functionality for authentication, role-based access control, customer and provider workflows, booking management, agent services, service discovery, notifications, payments, reviews, Redis caching, AI-powered features, administrative operations, and Docker-based development.

Built with **Node.js, Express.js, PostgreSQL, Redis, and Docker**.

---

## 🚀 Key Features

### 🔐 Authentication & Authorization

- JWT-based authentication
- Secure password hashing using bcrypt
- Protected API routes
- Role-based authorization
- Access control for different platform users
- Authentication middleware

### 📅 Booking Management

- Customer booking workflows
- Provider booking workflows
- Booking status management
- Booking-related operations
- Provider availability support

### 👨‍🔧 Provider & Agent Management

- Provider management
- Provider profile management
- Provider service management
- Provider verification workflows
- Provider-agent management
- Agent management
- Agent service management

### 🔎 Service Management

- Service management
- Category management
- Service discovery
- Provider service workflows

### 🤖 AI Features

- AI service integration
- AI-powered chatbot functionality
- AI-assisted service-related interactions

### 💳 Payment Management

- Payment processing workflows
- Payment status tracking
- Payment validation
- Duplicate payment prevention
- Payment-related notifications

### 🔔 Notifications

- Customer notifications
- Booking-related notifications
- Payment-related notifications
- Notification management

### ⭐ Reviews & Ratings

- Review management
- Provider ratings
- Customer feedback workflows

### ⚡ Performance & Caching

- Redis integration
- Cache hit handling
- Cache miss handling
- Cache invalidation
- Cache utility support

### 🗑 Data Management

- Pagination
- Search
- Filtering
- Sorting
- Soft delete support
- Restore workflows

### 📚 API & Developer Tools

- RESTful API architecture
- Swagger API documentation
- Postman API testing support

### 🐳 Containerization

- Docker support
- Docker Compose support
- Backend containerization
- PostgreSQL container support
- Redis container support

---

# 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript Runtime |
| Express.js | Backend Web Framework |
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

The structure below reflects the current codebase organization.

```text
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
├── .dockerignore
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

# 🏗 Architecture

The project follows a layered backend architecture to maintain separation of concerns and improve maintainability.

```text
Client
   │
   ▼
Routes
   │
   ▼
Middleware
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

This architecture helps provide:

- Better separation of concerns
- Improved maintainability
- Easier debugging
- Better scalability
- Cleaner code organization
- Easier feature expansion

---

# ⚙️ Prerequisites

Make sure the following software is installed on your system.

### Local Development

- Node.js
- npm
- PostgreSQL
- Redis

### Docker-Based Development

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

Create a `.env` file in the root directory of the project.

Example configuration:

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

> ⚠️ Never commit `.env` files, API keys, passwords, tokens, or production secrets to version control.

---

# ▶️ Running the Application

Start the application using the configured project script:

```bash
npm start
```

For development mode:

```bash
npm run dev
```

---

# 🐳 Docker Setup

The project supports containerized development using Docker and Docker Compose.

The Docker environment includes support for:

- Backend API
- PostgreSQL
- Redis

## Build and Start Containers

```bash
docker compose up --build
```

Run containers in detached mode:

```bash
docker compose up --build -d
```

---

## Stop Containers

```bash
docker compose down
```

To stop containers and remove associated Docker volumes:

```bash
docker compose down -v
```

> ⚠️ Removing Docker volumes may delete Docker-managed database and cache data.

---

# 🌐 Application Access

After starting the backend successfully, the application runs on the configured application port.

Example:

```text
http://localhost:<PORT>
```

The default port depends on your environment configuration.

---

# 📚 API Documentation

The project includes Swagger API documentation.

Once the application is running, API documentation can be accessed from the configured Swagger route.

Swagger documentation provides information about:

- Available API endpoints
- Request methods
- Request parameters
- Request bodies
- Authentication requirements
- API responses

---

# 🔐 Authentication

The API uses JWT-based authentication for protected resources.

After successful authentication, the client receives an access token.

Protected endpoints require the JWT token to be sent through the request headers.

Example:

```http
Authorization: Bearer <your_jwt_token>
```

Role-based middleware is used to restrict access to authorized users and roles.

---

# 🗄 Database

The application uses **PostgreSQL** as its primary relational database.

Database configuration is managed through environment variables.

The application contains separate model modules responsible for database operations across multiple domains, including:

- Users
- Customers
- Providers
- Agents
- Bookings
- Categories
- Services
- Payments
- Notifications
- Reviews
- Profiles
- Verification workflows
- Provider availability
- Provider services
- Agent services
- Service discovery

For Docker-based development, PostgreSQL can run as a separate container.

---

# ⚡ Redis Caching

Redis is integrated to improve application performance through caching.

The caching layer supports workflows such as:

- Cache retrieval
- Cache hit handling
- Cache miss handling
- Cache invalidation
- Performance optimization

Caching-related configuration and utilities are separated into dedicated modules.

```text
config/
├── redis.js
└── cacheKeys.js

utils/
└── cacheUtils.js
```

---

# 🤖 AI Services

The application includes AI-powered functionality through the service layer.

The current AI-related implementation includes:

- AI service integration
- Chatbot functionality
- AI-assisted service interactions

AI-related business logic is organized separately:

```text
services/
└── aiService.js
```

AI credentials and API keys should always be managed using secure environment variables.

---

# 📅 Booking Workflows

The platform supports multiple booking-related workflows.

The booking architecture includes dedicated modules for:

- Customer bookings
- Provider bookings
- Booking status management
- Provider booking operations
- Agent-related workflows

Booking logic is separated across:

```text
controllers/
├── bookingController.js
└── providerBookingController.js

models/
├── bookingModel.js
└── providerBookingModel.js

routes/
├── bookingRoutes.js
└── providerBookingRoutes.js
```

---

# 👨‍🔧 Provider & Agent Workflows

The backend includes dedicated functionality for provider and agent management.

Supported areas include:

- Provider management
- Provider profiles
- Provider services
- Provider verification
- Provider availability
- Provider-agent relationships
- Agent management
- Agent services

This separation allows different platform workflows to remain modular and maintainable.

---

# 🔎 Service Discovery

The platform includes dedicated service discovery functionality.

The service-related architecture includes modules for:

- Categories
- Services
- Provider services
- Service discovery
- Agent services

Relevant modules are separated into controllers, models, and routes to maintain a consistent backend structure.

---

# 💳 Payment Management

The backend contains dedicated payment functionality for handling payment-related workflows.

Supported areas include:

- Payment management
- Payment status tracking
- Payment validation
- Duplicate payment prevention
- Payment-related notification workflows

Payment functionality is organized using separate controller, model, and route modules.

---

# 🔔 Notifications

The application supports notification workflows for platform events.

Notification-related functionality includes:

- Customer notifications
- Booking-related notifications
- Payment-related notifications
- Notification management

---

# ⭐ Reviews & Ratings

The backend provides functionality for customer feedback and provider reviews.

Supported areas include:

- Review management
- Provider ratings
- Customer feedback workflows

---

# 🧪 API Testing

The APIs can be tested using tools such as:

- Swagger UI
- Postman

Before testing APIs that depend on external services, ensure that the following services are running correctly:

- Backend server
- PostgreSQL
- Redis

---

# 🔒 Security Practices

The project follows common backend security practices, including:

- Password hashing using bcrypt
- JWT-based authentication
- Role-based authorization
- Protected routes
- Environment-based configuration
- Secret management through environment variables
- Sensitive configuration excluded through `.gitignore`

For production deployments, secrets should be managed using a secure secret management solution.

---

# 🚀 Production Considerations

Before deploying the application to production, consider the following:

- Use strong JWT secrets
- Store production credentials securely
- Use a production-grade environment configuration strategy
- Manage secrets through a secure secret manager
- Configure proper logging
- Configure monitoring and alerting
- Enable database backups
- Review Redis persistence requirements
- Configure API rate limiting where required
- Configure additional security middleware where required
- Version Docker images properly
- Use appropriate production database configurations
- Configure error handling and monitoring

---

# 👨‍💻 Development Guidelines

When adding new functionality, follow the existing layered structure where applicable:

```text
Route
  ↓
Middleware
  ↓
Controller
  ↓
Service / Business Logic
  ↓
Model
  ↓
Database
```

Recommended practices:

- Keep route definitions focused on routing
- Keep business logic organized in controllers or services
- Keep database queries isolated in models
- Reuse middleware where possible
- Avoid committing secrets
- Maintain consistent naming conventions
- Keep modules focused on a specific responsibility

---

# 📌 Project Status

The project is actively under development.

The backend currently includes functionality and infrastructure for:

- Authentication and authorization
- Customer workflows
- Provider workflows
- Agent workflows
- Booking management
- Provider booking management
- Service management
- Service discovery
- Category management
- Payment workflows
- Notifications
- Reviews and ratings
- Provider verification
- Administrative workflows
- Redis caching
- AI-powered functionality
- Swagger API documentation
- Docker-based development

---

# 📄 License

This project is intended for development and organizational use unless otherwise specified.