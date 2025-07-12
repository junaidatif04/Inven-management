# Inventory Management System

A modern inventory management system built with React, TypeScript, Firebase, and Tailwind CSS.

## Features

- 🔐 User authentication with Firebase Auth
- 📊 Real-time dashboard with analytics
- 📦 Product and inventory management
- 🏪 Supplier management
- 📋 Order processing and tracking
- 🎯 Role-based access control
- 📱 Responsive design
- 🔔 Real-time notifications

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/junaidatif04/Inven-management.git
cd project
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your Firebase configuration values.

4. Start the development server:
```bash
npm run dev
```

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password and Google providers
3. Create a Firestore database
4. Enable Storage for file uploads
5. Copy your Firebase config to `.env`

Refer to `FIREBASE_SETUP.md` for detailed instructions.

## Deployment

### Netlify Deployment

1. **Automatic Deployment** (Recommended):
   - Connect your GitHub repository to Netlify
   - Netlify will automatically use the `netlify.toml` configuration
   - Environment variables are pre-configured in the file

2. **Manual Environment Setup**:
   - Go to Netlify Dashboard > Site Settings > Environment Variables
   - Add all `VITE_FIREBASE_*` variables from your `.env` file

3. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`

### Environment Variables for Production

Ensure these variables are set in your deployment platform:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, Notifications)
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
├── pages/              # Page components
├── services/           # Firebase service functions
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure build passes
5. Submit a pull request

## License

MIT License - see LICENSE file for details