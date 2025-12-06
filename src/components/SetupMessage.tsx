import React from 'react';
import { AlertCircle } from 'lucide-react';

export const SetupMessage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-8">
        <div className="flex items-center mb-4">
          <AlertCircle className="w-8 h-8 text-yellow-500 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Firebase Configuration Required</h1>
        </div>
        <div className="space-y-4 text-gray-700">
          <p>
            The application requires Firebase to be configured before it can run. Please follow these steps:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Create a Firebase project at <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Firebase Console</a></li>
            <li>Enable Authentication (Email/Password) and Firestore Database</li>
            <li>Get your Firebase configuration from Project Settings → General → Your apps → Web app</li>
            <li>Update <code className="bg-gray-100 px-2 py-1 rounded text-sm">src/firebase/config.ts</code> with your credentials</li>
            <li>Deploy Firestore security rules: <code className="bg-gray-100 px-2 py-1 rounded text-sm">firebase deploy --only firestore:rules</code></li>
            <li>Create an admin user in Firestore (see README.md for details)</li>
          </ol>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="font-semibold text-blue-900 mb-2">Configuration file location:</p>
            <code className="text-sm text-blue-800">src/firebase/config.ts</code>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              For detailed setup instructions, please refer to the <code className="bg-gray-200 px-1 rounded">README.md</code> or <code className="bg-gray-200 px-1 rounded">SETUP.md</code> files.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

