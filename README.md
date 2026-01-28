# 🚨 Disaster Management Platform - Sri Lanka

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.2.0-61dafb.svg)
![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E.svg)
![Status](https://img.shields.io/badge/status-Production%20Ready-success.svg)

**A comprehensive web-based disaster management system for Sri Lanka**

[Live Demo](#) • [Documentation](docs/DOCUMENTATION.md) • [API Reference](docs/API_REFERENCE.md) • [User Guide](docs/USER_GUIDE.md)

</div>

---

## 🌟 Overview

The **Disaster Management Platform** enables efficient coordination of emergency response, resource management, and community support during disasters such as floods, landslides, tsunamis, and other natural calamities in Sri Lanka.

### Key Features

| Feature                       | Description                          |
| ----------------------------- | ------------------------------------ |
| 🔴 **Missing Persons**        | Report and track missing individuals |
| 🌊 **Disaster Reporting**     | Submit incidents with location data  |
| 🐾 **Animal Rescue**          | Coordinate animal rescue operations  |
| 🏕️ **Camp Management**        | Manage relief camps and resources    |
| 🤝 **Volunteer Registration** | Register and coordinate volunteers   |
| 💰 **Donations**              | Secure payment processing via Stripe |
| 📞 **Emergency Contacts**     | Quick access to emergency services   |
| 🛡️ **Admin Dashboard**        | Comprehensive management panel       |

### Advanced Capabilities

- ⚡ **Real-time Updates** - Live data synchronization
- 🗺️ **Interactive Maps** - Location picking with Leaflet
- 👥 **Role-based Access** - Separate interfaces for reporters, responders, and admins
- 🔐 **Secure Authentication** - Supabase Auth integration
- 📱 **Responsive Design** - Mobile-friendly interface
- 🚀 **Code Splitting** - Optimized lazy loading

---

## 📚 Documentation

| Document                                       | Description                                 |
| ---------------------------------------------- | ------------------------------------------- |
| [📖 Full Documentation](docs/DOCUMENTATION.md) | Complete project overview and architecture  |
| [🔧 API Reference](docs/API_REFERENCE.md)      | Service layer and database operations       |
| [📱 User Guide](docs/USER_GUIDE.md)            | Guide for reporters, responders, and admins |
| [👨‍💻 Developer Guide](docs/DEVELOPER_GUIDE.md)  | Technical guide for contributors            |
| [🗄️ Supabase Setup](SUPABASE_SETUP.md)         | Database configuration guide                |
| [💳 Stripe Setup](STRIPE_SETUP_GUIDE.md)       | Payment integration guide                   |
| [🚀 Deployment](DEPLOYMENT.md)                 | AWS Amplify deployment guide                |
| [🔒 Security Audit](SECURITY_AUDIT_REPORT.md)  | Security implementation report              |

---

## 🛠️ Tech Stack

### Frontend

- **React 19** - UI Framework
- **React Router DOM 7** - Client-side routing
- **Tailwind CSS 3** - Utility-first styling
- **React Hook Form** - Form validation
- **Zustand** - State management
- **Framer Motion** - Animations
- **Leaflet** - Interactive maps
- **Vite** - Build tool

### Backend & Services

- **Supabase** - Backend as a Service
- **PostgreSQL** - Database
- **Stripe** - Payment processing
- **AWS Amplify** - Hosting

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier)
- Stripe account (for donations)

### Installation

```bash
# Clone repository
git clone https://github.com/your-username/Disaster-management.git
cd Disaster-management

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Start development server
npm run dev
```

### Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Stripe (optional)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
```

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start development server |
| `npm run build`   | Build for production     |
| `npm run preview` | Preview production build |
| `npm run lint`    | Run ESLint               |

---

## 📁 Project Structure

```
Disaster-management/
├── docs/                      # 📚 Documentation
│   ├── DOCUMENTATION.md       # Main documentation
│   ├── API_REFERENCE.md       # API reference
│   ├── USER_GUIDE.md          # User guide
│   └── DEVELOPER_GUIDE.md     # Developer guide
│
├── src/
│   ├── components/            # 🧩 Reusable components
│   ├── pages/                 # 📄 Page components
│   ├── services/              # 🔌 API services
│   ├── store/                 # 📦 Zustand stores
│   ├── contexts/              # 🔐 React contexts
│   ├── config/                # ⚙️ Configuration
│   └── utils/                 # 🛠️ Utilities
│
├── supabase/                  # 🗄️ Supabase config
│   ├── functions/             # Edge functions
│   └── migrations/            # DB migrations
│
└── public/                    # 📁 Static assets
```

---

## 👥 User Roles

### 📣 Reporter

- Report missing persons
- Submit disaster incidents
- Report animal rescues
- Request camp registration

### 🤝 Responder

- View all reports
- Mark incidents as resolved
- Register as volunteer
- Make donations

### 🛡️ Administrator

- Review camp requests
- Manage all camps
- View analytics
- Full system access

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           Frontend (React)               │
│   Components → Stores → Services         │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           Supabase (Backend)             │
│   Database │ Auth │ Storage │ Realtime   │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          External Services               │
│      Stripe │ Leaflet │ AWS Amplify      │
└─────────────────────────────────────────┘
```

---

## 🗄️ Database Tables

| Table             | Description                |
| ----------------- | -------------------------- |
| `missing_persons` | Missing person reports     |
| `disasters`       | Disaster incident reports  |
| `animal_rescues`  | Animal rescue cases        |
| `camps`           | Relief camp registry       |
| `camp_requests`   | Camp registration requests |
| `donations`       | Donation records           |

See [API Reference](docs/API_REFERENCE.md) for full schema details.

---

## 🔐 Security

- ✅ Row Level Security (RLS) on all tables
- ✅ Environment variables for secrets
- ✅ Secure authentication via Supabase
- ✅ PCI compliant payments via Stripe
- ✅ Protected admin routes

See [Security Audit Report](SECURITY_AUDIT_REPORT.md) for details.

---

## 📞 Emergency Contacts (Sri Lanka)

| Service                | Number  |
| ---------------------- | ------- |
| 🚔 Police Emergency    | **119** |
| 🚑 Ambulance           | **110** |
| 🚒 Fire & Rescue       | **111** |
| 🌊 Disaster Management | **117** |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [Developer Guide](docs/DEVELOPER_GUIDE.md) for detailed contribution guidelines.

---

## 📄 License

This project is developed for disaster management purposes in Sri Lanka.

---

## 🙏 Acknowledgments

- Sri Lanka Disaster Management Centre
- Open source community
- All contributors and volunteers

---

<div align="center">

**Made with ❤️ for Sri Lanka**

[⬆ Back to Top](#-disaster-management-platform---sri-lanka)

</div>
