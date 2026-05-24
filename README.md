# MedNow — AI-Powered Rural Healthcare Platform

A full-stack telemedicine platform connecting rural patients with doctors, pharmacies, and emergency services. Built with React (TanStack Start) + Node.js/Express + MongoDB.

---

## Prerequisites

Install these tools before you begin:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 20+ | https://nodejs.org |
| Bun | Latest | https://bun.sh |
| Git | Any | https://git-scm.com |

> **MongoDB is not required** — the backend starts an embedded in-memory MongoDB automatically for development.

---

## Getting Started in VSCode

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd mednow
```

### 2. Install frontend dependencies

```bash
bun install
```

### 3. Install backend dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Configure environment variables

The backend ships with a working `.env` in `backend/.env`. No changes are needed to run locally. To unlock extra features, open `backend/.env` and fill in:

```env
# Optional — leave blank to use embedded in-memory MongoDB (data resets on restart)
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/mednow

# Optional — enables the AI chatbot
GEMINI_API_KEY=your_gemini_api_key_here

# Optional — enables email notifications
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_app_password
```

Get a free MongoDB cluster at https://www.mongodb.com/cloud/atlas  
Get a free Gemini API key at https://aistudio.google.com/app/apikey

---

## Running the App

Open **two terminals** in VSCode (`` Ctrl+` `` to open the terminal, then click the **+** icon):

**Terminal 1 — Backend API (port 8000)**
```bash
cd backend
node server.js
```

**Terminal 2 — Frontend (port 5000)**
```bash
bun run dev
```

Then open http://localhost:5000 in your browser.

---

## Demo Accounts

These accounts are auto-created on every backend start (in-memory mode):

| Email | Password | Role |
|-------|----------|------|
| patient@demo.com | Password123 | Patient |
| doctor@demo.com | Password123 | Doctor |
| admin@demo.com | Password123 | Hospital Admin |

> Data resets whenever the backend restarts (in-memory mode). Set a real `MONGODB_URI` in `backend/.env` for persistence.

---

## Project Structure

```
mednow/
├── src/                        # React frontend (TanStack Start)
│   ├── routes/                 # File-based pages
│   │   ├── index.tsx           # Landing page
│   │   ├── login.tsx           # Login (3 roles)
│   │   ├── register.tsx        # Registration
│   │   ├── dashboard.patient.tsx
│   │   ├── dashboard.doctor.tsx
│   │   ├── dashboard.admin.tsx
│   │   ├── pharmacy.tsx        # Live medicine stock
│   │   ├── ambulance.tsx       # Emergency ambulance request
│   │   ├── telemedicine.tsx    # WebRTC video calls
│   │   └── health-records.tsx  # Offline-capable records
│   ├── components/
│   │   ├── mednow/             # App-specific components
│   │   │   ├── Navbar.tsx
│   │   │   ├── AIAssistant.tsx      # Gemini AI chatbot
│   │   │   ├── EmergencySOS.tsx
│   │   │   └── AppointmentModal.tsx
│   │   └── ui/                 # Shadcn/UI base components
│   └── lib/
│       ├── api.ts              # API client with JWT auth
│       ├── auth.tsx            # Auth context (3 roles)
│       ├── socket.ts           # Socket.io singleton
│       └── theme.tsx           # Dark mode context
│
├── backend/                    # Node.js/Express API
│   ├── server.js               # Entry point (port 8000)
│   ├── src/
│   │   ├── app.js              # Express setup + routes
│   │   ├── config/
│   │   │   ├── db.js           # MongoDB / embedded MongoDB
│   │   │   └── socket.js       # Socket.io + WebRTC signaling
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── User.js         # Patient, Doctor, Admin
│   │   │   ├── Hospital.js
│   │   │   ├── Appointment.js
│   │   │   ├── Medicine.js
│   │   │   ├── SOSAlert.js
│   │   │   ├── AmbulanceRequest.js
│   │   │   ├── HealthRecord.js
│   │   │   ├── Notification.js
│   │   │   └── ChatMessage.js
│   │   ├── controllers/        # Route handlers
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # Gemini AI, geolocation, notifications
│   │   ├── middleware/         # Auth, rate limiting, validation
│   │   └── utils/
│   │       ├── jwt.js
│   │       ├── logger.js
│   │       ├── response.js
│   │       └── seeder.js       # Auto-seeds demo data on first boot
│   └── .env                    # Backend environment variables
│
├── vite.config.ts              # Vite + API proxy config
├── tsconfig.json
├── components.json             # Shadcn/UI config
└── package.json
```

---

## API Overview

All endpoints are prefixed with `/api/v1/`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register (patient / doctor / hospital_admin) |
| POST | `/auth/login` | Login, returns JWT tokens |
| GET | `/auth/me` | Current user profile |
| GET | `/auth/doctors` | List available doctors |
| GET | `/medicines` | Live pharmacy stock |
| GET | `/hospitals` | Hospital list with bed availability |
| POST | `/appointments` | Book an appointment |
| GET | `/appointments/slots` | Available doctor slots |
| POST | `/sos/trigger` | Send emergency SOS |
| POST | `/ambulance/request` | Request ambulance |
| POST | `/chatbot/message` | AI health assistant |
| POST | `/chatbot/analyze-symptoms` | Symptom analysis |
| GET | `/health-records` | Patient health records |

---

## Tech Stack

**Frontend**
- React 19 + TanStack Start (SSR/SPA)
- TanStack Router (file-based routing)
- Tailwind CSS 4 + Shadcn/UI
- Socket.io client (real-time)
- WebRTC (video calls)
- Web Speech API (voice input)

**Backend**
- Node.js 20 + Express 4
- Mongoose + MongoDB (or embedded `mongodb-memory-server`)
- Socket.io (WebRTC signaling, real-time notifications)
- JWT (access + refresh tokens)
- Google Gemini AI (chatbot)
- Winston (logging)
- bcryptjs, express-validator, helmet, cors

---

## VSCode Extensions (Recommended)

Install these for the best development experience:

- **ESLint** — `dbaeumer.vscode-eslint`
- **Prettier** — `esbenp.prettier-vscode`
- **Tailwind CSS IntelliSense** — `bradlc.vscode-tailwindcss`
- **TypeScript Error Lens** — `usernamehw.errorlens`

Or install all at once from the terminal:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension usernamehw.errorlens
```

---

## Common Issues

**Backend crashes on startup**
- Make sure you ran `npm install` inside the `backend/` folder
- Check that port 8000 is not already in use: `lsof -i :8000` (Mac/Linux) or check Task Manager (Windows)

**Frontend shows blank page**
- Make sure the backend is running first (the frontend proxies `/api` to `localhost:8000`)
- Check that port 5000 is free

**Login fails with "Invalid credentials"**
- Demo accounts only exist while the backend is running (in-memory mode resets on restart)
- Restart the backend and try again

**AI chatbot not responding**
- Set `GEMINI_API_KEY` in `backend/.env` and restart the backend

---

## Building for Production

```bash
# Build the frontend
bun run build

# The output is in dist/ — serve it with any static host or Node server
```

For the backend in production, set:
```env
NODE_ENV=production
MONGODB_URI=<your-atlas-uri>
JWT_SECRET=<a-long-random-string>
JWT_REFRESH_SECRET=<another-long-random-string>
```
