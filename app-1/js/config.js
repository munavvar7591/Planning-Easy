// ==========================================================================
// PLANNINGEASY - FIREBASE & APP CONFIGURATION
// ==========================================================================

export const APP_CONFIG = {
  appName: 'PlanningEasy',
  version: '1.0.0',
  currencySymbol: '₹',
  defaultPeriod: 'this_year', // STRICT REQUIREMENT: Default dashboard period is "THIS YEAR"
  
  // Firebase configuration: replace with your project credentials if hosting on Firebase
  firebase: {
    apiKey: "AIzaSyD-PlanningEasyPlaceholderKey",
    authDomain: "planningeasy.firebaseapp.com",
    projectId: "planningeasy",
    storageBucket: "planningeasy.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:planningeasy0123"
  },

  // Categories for Finance
  financeCategories: [
    'Office Rent',
    'Salary',
    'Travel',
    'Food',
    'Equipment',
    'Donation',
    'Utilities',
    'Maintenance',
    'Event',
    'Other'
  ],

  // Initial Seeded Users (for instant secure login and out-of-the-box operation)
  initialUsers: [
    {
      uid: 'admin_root',
      username: 'admin',
      passwordHash: 'admin123', // In production auth, mapped to Firebase Auth
      name: 'System Admin',
      role: 'admin',
      position: 'President / Admin',
      photoUrl: null,
      phone: '+91 9876543210',
      whatsapp: '+91 9876543210',
      address: 'Central Admin Office',
      status: 'active',
      isOnline: true,
      createdAt: new Date().toISOString()
    },
    {
      uid: 'member_rahul',
      username: 'rahul',
      passwordHash: 'member123',
      name: 'Rahul Sharma',
      role: 'member',
      position: 'Treasurer',
      photoUrl: null,
      phone: '+91 9876500001',
      whatsapp: '+91 9876500001',
      address: 'Green Park, New Delhi',
      status: 'active',
      isOnline: false,
      createdAt: new Date().toISOString()
    },
    {
      uid: 'member_priya',
      username: 'priya',
      passwordHash: 'member123',
      name: 'Priya Patel',
      role: 'member',
      position: 'Secretary',
      photoUrl: null,
      phone: '+91 9876500002',
      whatsapp: '+91 9876500002',
      address: 'Satellite Road, Ahmedabad',
      status: 'active',
      isOnline: true,
      createdAt: new Date().toISOString()
    }
  ]
};
