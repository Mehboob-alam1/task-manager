# Task Manager - Tax & Accounting Firm

A custom web-based project & task management system built with React, TypeScript, and Firebase.

## Features

- **Task Management**: Admin-only task creation with comprehensive fields (client name, title, description, assigned employee, deadline, priority, estimated duration, net invoice amount)
- **Role-Based Access**: Admin and Staff roles with appropriate permissions
- **Real-Time Dashboard**: Live updates from Firestore showing task status, deadlines, and metrics
- **Calendar View**: Daily, weekly, and monthly views with color-coded tasks
- **Daily Reports**: Automated daily report generation via Cloud Functions
- **Notifications**: FCM-based notifications for task assignments, approaching deadlines, and overdue tasks
- **Responsive Design**: Works on desktop, tablet, and mobile browsers

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions, FCM, Hosting)
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable the following services:
   - Authentication (Email/Password)
   - Cloud Firestore
   - Cloud Functions
   - Cloud Messaging (FCM)
   - Hosting

3. Update `src/firebase/config.ts` with your Firebase configuration:
   ```typescript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

4. Get your VAPID key for FCM:
   - Go to Firebase Console > Project Settings > Cloud Messaging
   - Copy the Web Push certificate key
   - Update `src/firebase/config.ts` with your VAPID key

### 3. Firestore Security Rules

Deploy the security rules:
```bash
firebase deploy --only firestore:rules
```

### 4. Firestore Indexes

Deploy the indexes:
```bash
firebase deploy --only firestore:indexes
```

### 5. Cloud Functions Setup

```bash
cd functions
npm install
cd ..
```

Deploy Cloud Functions:
```bash
firebase deploy --only functions
```

### 6. Create Initial Admin User

1. Go to Firebase Console > Authentication
2. Add a user with email/password
3. Go to Firestore and create a document in the `users` collection with:
   - Document ID: The user's UID from Authentication
   - Fields:
     - `email`: User's email
     - `displayName`: User's name
     - `role`: "admin"
     - `createdAt`: Timestamp

### 7. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 8. Build for Production

```bash
npm run build
```

### 9. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

## Project Structure

```
task_manager/
├── functions/              # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts       # Cloud Functions code
│   └── package.json
├── src/
│   ├── components/         # React components
│   │   ├── Dashboard.tsx
│   │   ├── TaskForm.tsx
│   │   ├── TaskDetail.tsx
│   │   ├── CalendarView.tsx
│   │   ├── DailyReports.tsx
│   │   ├── Notifications.tsx
│   │   ├── UserManagement.tsx
│   │   ├── Login.tsx
│   │   └── Layout.tsx
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.tsx
│   │   └── NotificationContext.tsx
│   ├── firebase/          # Firebase configuration and utilities
│   │   ├── config.ts
│   │   ├── auth.ts
│   │   └── firestore.ts
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
└── package.json
```

## Features Details

### Task Management
- **Admin**: Create, edit, assign, and delete tasks
- **Staff**: View assigned tasks and update status (Pending, In Progress, On Hold, Completed)
- All task updates sync in real-time via Firestore

### Daily Reports
- Automated generation via Cloud Functions (runs daily at 9 AM)
- Includes: tasks completed today, pending tasks, overdue tasks, days taken per task
- Reports stored in Firestore and accessible via admin dashboard

### Notifications
- Task assignment notifications
- 24-hour deadline reminders
- Overdue task alerts
- In-app and push notifications via FCM

### Calendar View
- Monthly, weekly, and daily views
- Color-coded by priority and status
- Click on tasks to view details

## Security

- Firestore security rules enforce role-based access
- Admin-only routes protected at the application level
- Staff can only view and update their assigned tasks

## Notes

- User creation should be done through Firebase Console or via Cloud Functions with Admin SDK
- Email notifications require integration with a 3rd party email service (e.g., SendGrid, Mailgun)
- FCM requires HTTPS in production
- Cloud Functions use Node.js 18 runtime

## License

Private - Tax & Accounting Firm Internal Use

