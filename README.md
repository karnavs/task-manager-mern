# Task Manager MERN

My very first project I have built in 14 Days of Training in AuMDS
A full-stack task management application built using the MERN stack I

## Tech Stack

- Frontend: React, Vite
- Backend: Node.js, Express.js
- Database: MongoDB Atlas
- Authentication: JWT and bcrypt

## Features

- User registration and login
- Create, edit, and delete tasks
- Search, filter, and sort tasks
- User-specific task management
- Profile avatar upload

## Project Structure

```text
task-manager-mern/
├── backend/
├── frontend/
├── .gitignore
└── README.md
```

## Live Demo

Frontend: https://task-manager-mern-frontend-e0ku.onrender.com

## Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/karnavs/task-manager-mern.git
cd task-manager-mern
```

### 2. Start the backend

```bash
cd backend
npm install
npm start
```

Configure the required environment variables in `backend/.env` before starting the server.

### 3. Start the frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Configure `VITE_API_URL` in the frontend environment to point to your backend API.

## Database

The application uses MongoDB Atlas to store user and task data.

## Author

Karna VS - Intern @ AuMDS