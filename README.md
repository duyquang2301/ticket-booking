# Ticket Booking System

A microservices-based ticket booking system for concerts built with NestJS, MongoDB, and Redis.

## System Architecture

The application consists of three main microservices:

1. **Auth Service** (Port 3000): Handles user authentication and account management
2. **Concert Service** (Port 3001): Manages concert information and available seat types
3. **Booking Service** (Port 3002): Processes ticket bookings and cancellations

### Technologies Used

- **Backend**: NestJS, TypeScript
- **Database**: MongoDB
- **Caching**: Redis
- **Containerization**: Docker, Docker Compose
- **Load Testing**: k6

## Prerequisites

- Docker and Docker Compose
- Node.js (v22) and npm (for local development)

## Setup and Installation

### Using Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/duyquang2301/ticket-booking.git
   cd ticket-booking
   ```

2. Start the services:
   ```bash
   docker-compose up -d
   ```

3. The services will be available at:
   - Auth Service: http://localhost:3000
   - Concert Service: http://localhost:3001
   - Booking Service: http://localhost:3002

### Local Development

Each service can be run independently for development:

1. Navigate to a service directory:
   ```bash
   cd auth-service
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the service in development mode:
   ```bash
   npm run start:dev
   ```

## API Endpoints

### Auth Service

- POST `/auth/register` - Register a new user
- POST `/auth/login` - Login and get JWT token

### Concert Service

- GET `/concerts` - Get all concerts
- GET `/concerts/:id` - Get concert details by ID
- PATCH `/concerts/seat-types/:id` - Update seat type information

### Booking Service

- POST `/bookings` - Create a new booking
- DELETE `/bookings/:id` - Cancel a booking

## Load Testing

The project includes a load testing suite using k6. The test simulates multiple users:
1. Logging in
2. Viewing concert details
3. Booking tickets

To run the load test:

```bash
docker-compose up k6
```

## Environment Variables

To configure the environment variables for each service, follow the steps below:

1. **Create a `.env` file** in the root directory of the project.
2. Copy the template for the `.env` file and add the necessary configurations.

```bash
cp .env.example .env
```


### Auth Service
- `PORT` - Service port (default: 3000)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens

### Concert Service
- `PORT` - Service port (default: 3001)
- `MONGO_URI` - MongoDB connection string

### Booking Service
- `PORT` - Service port (default: 3002)
- `MONGO_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT tokens

## License

MIT

---
