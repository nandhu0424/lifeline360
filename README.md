<div align="center">

<img src="https://img.shields.io/badge/Lifeline360-Healthcare%20Monitoring-brightgreen?style=for-the-badge&logo=heart&logoColor=white" alt="Lifeline360" />

# 🏥 Lifeline360

### *Intelligent Healthcare Monitoring & Management Platform*

> A full-stack, real-time healthcare operations platform designed for the **District Health Management System (DDHS)** of Tamil Nadu — enabling seamless coordination between District Officers, Primary Health Centres, and administrative superusers.

<br/>

[![Live Frontend](https://img.shields.io/badge/🌐%20Live%20Frontend-lifeline360--frontend.onrender.com-4CAF50?style=for-the-badge)](https://lifeline360-frontend.onrender.com)
[![Live Backend](https://img.shields.io/badge/⚙️%20Live%20Backend%20API-lifeline360--mn5c.onrender.com-2196F3?style=for-the-badge)](https://lifeline360-mn5c.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-nandhu0424%2Flifeline360-181717?style=for-the-badge&logo=github)](https://github.com/nandhu0424/lifeline360)

<br/>

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)
![Vite](https://img.shields.io/badge/Vite-SuperAdmin-646CFF?style=flat-square&logo=vite)
![Render](https://img.shields.io/badge/Deployed-Render-46E3B7?style=flat-square&logo=render)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=flat-square&logo=jsonwebtokens)

</div>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [User Roles & Access](#-user-roles--access)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)

---

## 🌟 Overview

**Lifeline360** is a production-grade healthcare monitoring system built to digitise and streamline healthcare operations across **323+ Primary Health Centres (PHCs)** in Tamil Nadu. The platform provides real-time visibility into attendance, stock levels, patient records, disease outbreaks, staff management, and grievance handling — all from a single unified dashboard.

The system serves three distinct user roles — **District Health Officers (DDHS)**, **PHC Health Centre Staff**, and **Super Administrators** — each with tailored dashboards, permissions, and workflows.

---

## 🚀 Live Demo

| Portal | URL | Credentials |
|--------|-----|-------------|
| 🏥 **Health Centre Login** | [lifeline360-frontend.onrender.com](https://lifeline360-frontend.onrender.com) | Hospital ID: `ARA001` / Password: `phc@ara001` |
| 🧑‍💼 **DDHS Officer Login** | [lifeline360-frontend.onrender.com](https://lifeline360-frontend.onrender.com) | Username: `mdu_admin` / Password: `password123` |
| 🔐 **Super Admin Portal** | *(Render Static Site)* | Email: `admin@lifeline360.gov.in` / Password: `Admin@123` |
| ⚙️ **REST API** | [lifeline360-mn5c.onrender.com](https://lifeline360-mn5c.onrender.com) | — |

> **Note:** Hosted on Render's free tier — initial load may take 30–60 seconds on cold start.

---

## ✨ Features

### 🧑‍⚕️ PHC Health Centre Dashboard
- 📊 Real-time operational stats (attendance, OPD trend, stock levels)
- 👥 Staff details and biometric attendance tracking
- 💊 Medicine & stock inventory reporting
- 🧾 Patient record management
- 📋 Health programs tracking
- 🏖️ Leave application and status tracking

### 🧑‍💼 DDHS District Officer Dashboard
- 🗺️ District-wide hospital overview with live status
- 📡 Real-time automated alert system (attendance anomalies, low stock, disease outbreaks, overdue OPD)
- 🏥 Hospital management across 323+ health centres
- 📊 Attendance monitoring and analytics
- 📦 Stock & medicine reports aggregated by district
- 🧑‍🔬 Staff management and work assignment workflows
- 🏥 Health programme coordination
- 📝 Leave approval management
- 🚨 Grievance tracking and resolution

### 🔐 Super Admin Portal *(Vite + React)*
- 👤 Manage DDHS user accounts
- 🏥 Hospital and PHC user administration
- 📋 Grievance staff management
- 📊 System-wide analytics dashboard

### ⚙️ Intelligent Backend Engine
- ⏰ **Automated Alert Scheduler**: Runs every 1 minute to detect attendance anomalies, stock shortages, and disease case spikes
- 📧 **Email Notification System**: Automated alerts sent via Nodemailer for critical events
- 🔐 **Role-based JWT Authentication**: Separate secure token flows for PHC, DDHS, and SuperAdmin roles
- 🔄 **Biometric Sync API**: Receives punch-in/out data from biometric devices installed at health centres
- 🗄️ **OTP-based Password Reset**: Secure forgot-password flow with time-limited OTPs

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│  ┌───────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │  PHC Portal   │  │ DDHS Portal│  │  SuperAdmin App  │  │
│  │  (React CRA)  │  │ (React CRA)│  │   (React + Vite) │  │
│  └───────┬───────┘  └─────┬──────┘  └────────┬─────────┘  │
└──────────┼────────────────┼──────────────────┼────────────┘
           │                │                  │
           └────────────────┼──────────────────┘
                            │  REST API (HTTPS)
                            ▼
┌───────────────────────────────────────────────┐
│          Node.js + Express Backend            │
│  ┌─────────────┐  ┌──────────────────────┐   │
│  │ JWT Auth    │  │  Alert Scheduler     │   │
│  │ Middleware  │  │  (node-cron)         │   │
│  └─────────────┘  └──────────────────────┘   │
│  ┌─────────────────────────────────────────┐  │
│  │  REST API Routes (17 route modules)     │  │
│  │  auth │ hospitals │ staff │ alerts      │  │
│  │  attendance │ stocks │ patients │ work  │  │
│  │  programs │ leave │ grievances │ phc    │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────┬────────────────────────┘
                       │  Mongoose ODM
                       ▼
         ┌─────────────────────────┐
         │   MongoDB Atlas         │
         │  (323 hospitals, 3876   │
         │   staff, 27k+ records)  │
         └─────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, React Router v6, Axios | PHC & DDHS portal UI |
| **Admin Portal** | React 18, Vite 4, React Router v6 | Superadmin dashboard |
| **UI Libraries** | MUI v5, Recharts, React Leaflet | Charts, maps, components |
| **Backend** | Node.js, Express.js | REST API server |
| **Database** | MongoDB Atlas, Mongoose | Data persistence & ODM |
| **Authentication** | JWT (jsonwebtoken), bcryptjs | Secure role-based auth |
| **Scheduler** | node-cron | Automated health alerts |
| **Email** | Nodemailer + Gmail SMTP | Alert & OTP emails |
| **Deployment** | Render (Web Service + Static Sites) | Cloud hosting |
| **Version Control** | Git + GitHub | Source management |

---

## 📁 Project Structure

```
lifeline360/
│
├── backend/                        # Node.js + Express REST API
│   ├── config/
│   │   └── db.js                   # MongoDB connection with DNS fallback
│   ├── controllers/                # Business logic (17 controllers)
│   ├── middleware/
│   │   ├── auth.js                 # JWT verification middleware
│   │   └── districtFilter.js       # District-scoped data isolation
│   ├── models/                     # Mongoose schemas (18 models)
│   │   ├── Hospital.js
│   │   ├── PHCUser.js
│   │   ├── User.js (DDHS)
│   │   ├── Staff.js
│   │   ├── Attendance.js
│   │   ├── Alert.js
│   │   ├── Stock.js
│   │   ├── Patient.js
│   │   ├── Work.js
│   │   ├── Leave.js
│   │   ├── Grievance.js
│   │   └── ...
│   ├── routes/                     # Express routes (17 modules)
│   ├── utils/
│   │   └── alertScheduler.js       # Cron-based alert engine
│   └── server.js                   # Entry point
│
├── frontend/                       # React CRA — PHC & DDHS Portals
│   └── src/
│       ├── pages/
│       │   ├── ddhs/               # DDHS Officer views
│       │   │   ├── Dashboard.js
│       │   │   ├── Hospitals.js
│       │   │   ├── Attendance.js
│       │   │   ├── Alerts.js
│       │   │   ├── StocksReports.js
│       │   │   ├── WorkAssignments.js
│       │   │   ├── Programs.js
│       │   │   └── LeaveManagement.js
│       │   └── phc/                # PHC Health Centre views
│       │       ├── PHCDashboard.js
│       │       └── components/
│       │           ├── PatientRecords.js
│       │           ├── StaffDetails.js
│       │           ├── StockReport.js
│       │           ├── Programs.js
│       │           └── LeaveManagement.js
│       └── services/
│           └── api.js              # Centralized Axios API client
│
└── superadmin/                     # Vite React — Super Admin Portal
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── Hospitals.jsx
        │   ├── DDHSUsers.jsx
        │   ├── PHCUsers.jsx
        │   ├── Grievances.jsx
        │   └── GrievanceStaff.jsx
        └── context/
            └── AuthContext.jsx     # Global auth state
```

---

## 📡 API Reference

Base URL: `https://lifeline360-mn5c.onrender.com`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | ❌ | DDHS/Admin login |
| `POST` | `/api/auth/phc/login` | ❌ | Health Centre login |
| `GET` | `/api/auth/verify` | ✅ JWT | Verify token |
| `POST` | `/api/auth/forgot-password` | ❌ | Send OTP to email |
| `GET` | `/api/hospitals` | ✅ | List hospitals (district-scoped) |
| `GET` | `/api/dashboard` | ✅ | District dashboard stats |
| `GET` | `/api/attendance` | ✅ | Attendance records |
| `GET` | `/api/alerts` | ✅ | Real-time system alerts |
| `GET` | `/api/staff` | ✅ | Staff management |
| `GET` | `/api/stocks` | ✅ | Stock & medicine inventory |
| `GET` | `/api/patients` | ✅ | Patient records |
| `GET/POST` | `/api/work` | ✅ | Work assignments |
| `GET/POST` | `/api/leave` | ✅ | Leave management |
| `GET/POST` | `/api/grievances` | ✅ | Grievance portal |
| `GET` | `/api/programs` | ✅ | Health programmes |
| `GET` | `/api/phc/stats` | ✅ | PHC dashboard stats |

---

## 👥 User Roles & Access

```
┌────────────────┬──────────────────────────────────────────────────┐
│ Role           │ Capabilities                                      │
├────────────────┼──────────────────────────────────────────────────┤
│ 🔐 SuperAdmin  │ Full system control — manage all users,           │
│                │ hospitals, and grievance staff                    │
├────────────────┼──────────────────────────────────────────────────┤
│ 🧑‍💼 DDHS      │ District-scoped access — monitor hospitals,        │
│                │ alerts, attendance, work, leave, grievances       │
├────────────────┼──────────────────────────────────────────────────┤
│ 🏥 PHC User    │ Health Centre portal — manage own patients,       │
│                │ staff, stocks, programs, attendance, leaves       │
└────────────────┴──────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB Atlas account (or local MongoDB)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/nandhu0424/lifeline360.git
cd lifeline360
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/lifeline360
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

```bash
# Seed the superadmin
node seed_superadmin.js

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
REACT_APP_API_URL=http://localhost:5000
```

```bash
npm start
```

### 4. SuperAdmin Portal Setup

```bash
cd superadmin
npm install
```

Create a `.env` file inside `superadmin/`:

```env
VITE_API_URL=http://localhost:5000
```

```bash
npm run dev
```

---

## 🔐 Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `MONGODB_URI` | Backend | MongoDB Atlas connection string with `/lifeline360` DB |
| `JWT_SECRET` | Backend | Secret key for JWT signing |
| `JWT_EXPIRE` | Backend | Token expiry (e.g. `7d`) |
| `EMAIL_USER` | Backend | Gmail address for alert emails |
| `EMAIL_PASS` | Backend | Gmail App Password |
| `REACT_APP_API_URL` | Frontend | Backend API base URL |
| `VITE_API_URL` | SuperAdmin | Backend API base URL |

---

## ☁️ Deployment

The entire platform is deployed on **[Render](https://render.com)** as three separate services:

| Service | Type | Root Dir | Build Command |
|---------|------|----------|--------------|
| `lifeline360-backend` | Web Service (Node) | `backend` | `npm install` |
| `lifeline360-frontend` | Static Site | `frontend` | `npm install && npm run build` |
| `lifeline360-superadmin` | Static Site | `superadmin` | `npm install && npm run build` |

> All environment variables are configured in the Render Dashboard under each service's **Environment** tab.

---

## 🌐 Database

- **Cloud**: MongoDB Atlas (Free Tier M0)
- **Database**: `lifeline360`
- **Collections**: `hospitals`, `healthcenter_users`, `users`, `staffs`, `attendances`, `alerts`, `stocks`, `patients`, `works`, `leaves`, `grievances`, `programs`, `superadmins`, `otps`, and more

| Collection | Records |
|------------|---------|
| `hospitals` | 323 |
| `staffs` | 3,876 |
| `attendances` | 27,132+ |
| `patients` | 3,230 |
| `alerts` | 1,431+ |

---

## 👨‍💻 Author

**Nandhini** — Full Stack Developer

> Built with ❤️ to digitise and improve public healthcare delivery in Tamil Nadu.

[![GitHub](https://img.shields.io/badge/GitHub-nandhu0424-181717?style=for-the-badge&logo=github)](https://github.com/nandhu0424)

---

<div align="center">
<sub>⭐ Star this repository if you found it helpful!</sub>
</div>
