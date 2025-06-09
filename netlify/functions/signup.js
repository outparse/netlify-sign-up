const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
admin.initializeApp({
credential: admin.credential.cert({
projectId: process.env.FIREBASE_PROJECT_ID,
clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
}),
databaseURL: process.env.FIREBASE_DATABASE_URL
});
}

const db = admin.firestore();

exports.handler = async (event) => {
if (event.httpMethod !== 'POST') {
return {
statusCode: 405,
body: JSON.stringify({ message: 'Method Not Allowed' })
};
}

try {
const { fullName, email, password, marketingOptIn } = JSON.parse(event.body);

// Validate input
if (!fullName || !email || !password) {
return {
statusCode: 400,
body: JSON.stringify({ message: 'Missing required fields' })
};
}

// Create user with Firebase Authentication
const userRecord = await admin.auth().createUser({
email,
password,
displayName: fullName
});

// Save additional user data to Firestore
await db.collection('users').doc(userRecord.uid).set({
fullName,
email,
marketingOptIn: marketingOptIn || false,
createdAt: admin.firestore.FieldValue.serverTimestamp(),
lastLogin: admin.firestore.FieldValue.serverTimestamp()
});

return {
statusCode: 200,
body: JSON.stringify({ 
message: 'User created successfully',
userId: userRecord.uid 
})
};

} catch (error) {
console.error('Error creating user:', error);

let errorMessage = 'An error occurred during signup. Please try again.';

if (error.code === 'auth/email-already-in-use') {
errorMessage = 'This email is already registered. Please use a different email.';
} else if (error.code === 'auth/weak-password') {
errorMessage = 'Password should be at least 8 characters.';
} else if (error.code === 'auth/invalid-email') {
errorMessage = 'Please enter a valid email address.';
}

return {
statusCode: 400,
body: JSON.stringify({ message: errorMessage })
};
}
};
