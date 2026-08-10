# Urbino Help Backend API

A production-ready Backend API for an On-Demand Home Service Platform built with Node.js, Express.js and PostgreSQL.

## Features

- JWT Authentication
- Role Based Authorization
- Customer Booking Management
- Provider Booking Management
- Agent Job Management
- Admin Dashboard
- Pagination
- Search
- Sorting
- Swagger API Documentation
- Soft Delete
- Secure Password Hashing (bcrypt)

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- JWT
- bcryptjs
- Swagger UI
- Postman

## Project Structure

src/
├── config/
├── constants/
├── controllers/
├── middleware/
├── models/
├── routes/
├── utils/

## Installation

```bash
git clone <repository-url>

cd urbino-help-backend

npm install
```

## Environment Variables

Create a .env file

```env
PORT=5500

DB_HOST=localhost

DB_PORT=5432

DB_NAME=urbino_help

DB_USER=postgres

DB_PASSWORD=your_password

JWT_SECRET=your_secret_key
```

## Run Project

```bash
npm run dev
```

## Swagger Documentation

```
http://localhost:5500/api-docs
```

## Main Modules

### Authentication

- Register
- Login

### Customer

- Create Booking
- My Bookings
- Cancel Booking

### Provider

- View Pending Bookings
- Accept Booking
- Assign Agent
- Complete Booking

### Agent

- My Jobs
- Accept Job
- On The Way
- Start Work
- Complete Work

### Admin

- Dashboard
- Users Management
- Booking Management
- Assign Agent
- Soft Delete Agent
- Restore Agent

## Author

Mohammad Umar