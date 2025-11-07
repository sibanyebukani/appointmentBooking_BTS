# 🚀 Quick Start Guide - BookIt Appointment System

## 📦 What's Been Built

A complete appointment booking system with:
- ✅ **Secure Authentication** (JWT + Refresh Tokens)
- ✅ **User Profiles** (Personal + Business details)
- ✅ **Dashboard** (Sessions, Security, Activity)
- ✅ **Rate Limiting** (Protection against abuse)
- ✅ **Audit Logging** (Complete security tracking)
- ✅ **Password Security** (Breach detection via HaveIBeenPwned)

---

## 🏃 Start the System

### 1. Start API Server
```bash
cd api
npm run dev
```
**Server URL:** http://localhost:4000
**Status:** ✅ MongoDB Connected

### 2. Access Frontend
**Main Login:** http://localhost:57833/login.html
**Dashboard:** http://localhost:57833/dashboard.html

---

## 👤 Test Accounts

### Account 1: Barber
- **Email:** `sarah.johnson@barbershop.com`
- **Password:** `SecureBarber2024!@#`
- **Business:** Classic Cuts Barbershop (Los Angeles)
- **Profile:** ✅ Complete with business hours

### Account 2: Hair Salon
- **Email:** `emily.chen@salon.com`
- **Password:** `SalonPro2024!@#$`
- **Business:** Elegance Hair Studio (New York)
- **Profile:** ✅ Complete with business hours

### Account 3: Dentist
- **Email:** `dr.michael.brown@dentalcare.com`
- **Password:** `DentalCare2024!@#$`
- **Business:** Bright Smile Dental Clinic (Chicago)
- **Profile:** ✅ Complete with business hours

### Account 4: Test User
- **Email:** `john.smith@example.com`
- **Password:** `SecureP@ssw0rd!2024$XyZ`
- **Business:** Smith Barbershop (New York)
- **Profile:** ✅ Complete with business hours

---

## 🎯 Try These Features

### 1. Login & Dashboard
```
1. Go to: http://localhost:57833/login.html
2. Login with: sarah.johnson@barbershop.com
3. Password: SecureBarber2024!@#
4. View dashboard with full profile
```

### 2. Session Management
```
1. In Dashboard, click "Active Sessions"
2. See current device info
3. Try "Logout All Devices" button
4. Login again to test refresh tokens
```

### 3. Profile Management
```
1. Click "Settings" in sidebar
2. Update your profile information
3. Change notification preferences
4. View business hours
```

### 4. Security Features
```
1. Click "Security" in sidebar
2. View security notifications
3. Check security score (95%)
4. See recent security events
```

### 5. Activity Timeline
```
1. Click "Activity Timeline" in sidebar
2. See all recent activities
3. Filter by date range
4. View login history with locations
```

---

## 🔧 API Testing

### Register New User
```bash
curl -X POST http://localhost:4000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "fullName": "New User",
    "password": "UniqueP@ssw0rd!2024"
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah.johnson@barbershop.com",
    "password": "SecureBarber2024!@#"
  }'
```

### Get Profile (use token from login)
```bash
curl -X GET http://localhost:4000/v1/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update Profile
```bash
curl -X PUT http://localhost:4000/v1/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Updated bio text",
    "phoneNumber": "+1 (555) 999-8888",
    "emailNotifications": true
  }'
```

---

## 🔐 Security Features in Action

### 1. Password Breach Detection
Try registering with a common password:
```bash
curl -X POST http://localhost:4000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "Test",
    "password": "Password123!"
  }'
```
**Result:** ❌ Blocked - password exposed in breaches

### 2. Rate Limiting
Try registering 4+ accounts from the same IP:
```bash
# This will work for first 3 attempts
# 4th attempt will be blocked for 1 hour
```
**Result:** ❌ Blocked - "Too many registration attempts"

### 3. Token Refresh
```bash
curl -X POST http://localhost:4000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```
**Result:** ✅ New access token + new refresh token (old one revoked)

---

## 📊 Database

### MongoDB Collections Created
1. **users** - User accounts with profiles
2. **refreshTokens** - Active refresh tokens
3. **auditLogs** - Security events and activities
4. **passwordResetTokens** - Password reset tokens
5. **appointments** - (ready for Phase 3)

### View Data
```bash
# Connect to MongoDB (if you have mongo shell)
mongosh YOUR_MONGODB_URI

# Switch to database
use appointments

# View users
db.users.find().pretty()

# View audit logs
db.auditLogs.find().sort({timestamp: -1}).limit(10).pretty()

# View refresh tokens
db.refreshTokens.find({revoked: false}).pretty()
```

---

## 🎨 UI Features

### Dashboard Sections
1. **Overview** - Stats cards (appointments, sessions, security score)
2. **Active Sessions** - Device management with logout options
3. **Security** - Security score, notifications, alerts
4. **Activity Timeline** - Complete activity history
5. **Settings** - Profile and preference management

### Navigation
- Sidebar navigation for all sections
- User profile widget with logout
- Toast notifications for all actions
- Loading overlays for async operations

---

## ⚠️ Important Notes

### Rate Limits (Per IP)
- **Registration:** 3 per hour
- **Login:** 5 per 15 minutes
- **Password Reset:** 3 per hour
- **General API:** 100 per 15 minutes

### Token Expiry
- **Access Token:** 15 minutes
- **Refresh Token:** 7 days
- **Email Verification:** 24 hours
- **Password Reset:** 1 hour

### Email Configuration
Currently in DEV MODE - emails printed to console.
To enable real emails, add to `api/.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 📁 Project Structure

```
AppointmentBooking/
├── api/                          # Backend API
│   ├── src/
│   │   ├── routes/              # API endpoints
│   │   │   ├── auth.ts          # Authentication
│   │   │   ├── profile.ts       # Profile management
│   │   │   └── security.ts      # Security dashboard
│   │   ├── lib/                 # Utilities
│   │   │   ├── auth.ts          # JWT, passwords
│   │   │   ├── passwordBreach.ts # HaveIBeenPwned
│   │   │   ├── recaptcha.ts     # reCAPTCHA
│   │   │   └── logger.ts        # Security logging
│   │   ├── repos/               # Database layer
│   │   ├── models/              # Data models
│   │   └── middleware/          # Rate limiting, errors
│   └── test-data/               # Sample data scripts
├── web/                         # Frontend
│   └── public/
│       ├── login.html           # Login page
│       ├── register.html        # Registration
│       ├── dashboard.html       # Main dashboard
│       └── forgot-password.html # Password reset
├── TESTING_SUMMARY.md           # Complete test results
├── QUICK_START.md               # This file
└── SECURITY-CHECKLIST.md        # Security features list
```

---

## 🎯 What's Ready

✅ **Authentication System**
- Registration with email verification
- Login with JWT + Refresh tokens
- Password reset flow
- Session management

✅ **Profile System**
- Personal details (name, phone, bio)
- Business information (name, type, address, hours)
- Notification preferences
- Avatar support

✅ **Security**
- Password breach detection
- Rate limiting on all endpoints
- Account lockout after failed attempts
- Audit logging for all events
- Session hijacking detection

✅ **Dashboard**
- Session management UI
- Security notifications
- Activity timeline
- Profile settings
- Professional UI matching auth pages

---

## 🚧 Phase 3 - Coming Next

1. **Appointments Module**
   - Create/edit/delete appointments
   - Calendar view
   - Time slot management
   - Booking confirmation

2. **Client Management**
   - Client profiles
   - Appointment history
   - Notes and preferences

3. **Notifications**
   - Email reminders
   - SMS notifications
   - Push notifications

4. **Reports**
   - Business analytics
   - Revenue tracking
   - Popular services

---

## 💡 Pro Tips

1. **Testing Different Users:** Logout and login with different accounts to see various business profiles

2. **Security Events:** Check the console where the API is running to see security events in real-time

3. **Rate Limiting:** If you get blocked, wait 15 minutes or restart the server

4. **Session Management:** Try logging in from different browsers to see multiple sessions

5. **Profile Updates:** All profile changes are validated on the backend

---

## 🆘 Troubleshooting

### API Won't Start
```bash
# Check if MongoDB is accessible
cd api
npm run db:ping

# Check .env file exists
ls -la api/.env

# Rebuild
npm run build
```

### Can't Login
- Check password matches exactly (case-sensitive)
- Verify account was created successfully
- Check console for rate limiting messages

### Profile Not Updating
- Verify JWT token is valid (check expiry)
- Check for validation errors in response
- Ensure all fields match expected format

### Rate Limited
- Wait the specified time period
- Or restart the API server (dev only)

---

## 📞 Support

For issues or questions:
1. Check `TESTING_SUMMARY.md` for complete test results
2. Check `SECURITY-CHECKLIST.md` for feature list
3. Check server console for error messages
4. Check browser console for client-side errors

---

**🎉 Enjoy exploring the BookIt Appointment System!**

All core authentication and profile features are fully operational and ready to use.

---

**Last Updated:** 2025-11-07
**Version:** 1.0.0
