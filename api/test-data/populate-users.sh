#!/bin/bash

# Script to populate database with sample users
API_URL="http://localhost:4000/v1"

echo "🚀 Populating database with sample users..."
echo ""

# Function to register and update a user
register_user() {
  local email=$1
  local fullName=$2
  local password=$3
  local businessData=$4

  echo "📝 Registering: $fullName ($email)"

  # Register user
  RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"fullName\": \"$fullName\",
      \"password\": \"$password\"
    }")

  # Extract token
  TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -z "$TOKEN" ]; then
    echo "   ❌ Failed to register $email"
    echo "   Response: $RESPONSE"
    return
  fi

  echo "   ✅ Registered successfully"

  # Update profile with business data
  if [ -n "$businessData" ]; then
    echo "   📊 Updating profile with business data..."
    UPDATE_RESPONSE=$(curl -s -X PUT "${API_URL}/profile" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$businessData")

    echo "   ✅ Profile updated"
  fi

  echo ""
}

# User 1: Barber
register_user \
  "sarah.johnson@barbershop.com" \
  "Sarah Johnson" \
  "SecureBarber2024!@#" \
  '{
    "phoneNumber": "+1 (555) 234-5678",
    "bio": "Master barber with 15 years of experience. Specializing in fades, tapers, and beard grooming. Winner of Best Barber 2023 award.",
    "avatarUrl": "https://i.pravatar.cc/300?img=5",
    "timezone": "America/Los_Angeles",
    "language": "en",
    "businessName": "Classic Cuts Barbershop",
    "businessType": "Barbershop",
    "businessAddress": "456 Sunset Blvd, Los Angeles, CA 90028",
    "businessPhone": "+1 (555) 234-5678",
    "businessHours": {
      "monday": { "open": "08:00", "close": "19:00" },
      "tuesday": { "open": "08:00", "close": "19:00" },
      "wednesday": { "open": "08:00", "close": "19:00" },
      "thursday": { "open": "08:00", "close": "20:00" },
      "friday": { "open": "08:00", "close": "20:00" },
      "saturday": { "open": "09:00", "close": "18:00" },
      "sunday": { "open": "10:00", "close": "16:00" }
    },
    "emailNotifications": true,
    "smsNotifications": true,
    "pushNotifications": true,
    "marketingEmails": true
  }'

# User 2: Hair Salon
register_user \
  "emily.chen@salon.com" \
  "Emily Chen" \
  "SalonPro2024!@#$" \
  '{
    "phoneNumber": "+1 (555) 345-6789",
    "bio": "Professional hair stylist and colorist. Certified in Balayage, Ombre, and Hair Extensions. Creating beautiful transformations since 2015.",
    "avatarUrl": "https://i.pravatar.cc/300?img=10",
    "timezone": "America/New_York",
    "language": "en",
    "businessName": "Elegance Hair Studio",
    "businessType": "Hair Salon",
    "businessAddress": "789 Fashion Ave, New York, NY 10001",
    "businessPhone": "+1 (555) 345-6789",
    "businessHours": {
      "monday": { "closed": true },
      "tuesday": { "open": "09:00", "close": "20:00" },
      "wednesday": { "open": "09:00", "close": "20:00" },
      "thursday": { "open": "09:00", "close": "21:00" },
      "friday": { "open": "09:00", "close": "21:00" },
      "saturday": { "open": "08:00", "close": "18:00" },
      "sunday": { "open": "10:00", "close": "17:00" }
    },
    "emailNotifications": true,
    "smsNotifications": true,
    "pushNotifications": false,
    "marketingEmails": true
  }'

# User 3: Dental Clinic
register_user \
  "dr.michael.brown@dentalcare.com" \
  "Dr. Michael Brown" \
  "DentalCare2024!@#$" \
  '{
    "phoneNumber": "+1 (555) 456-7890",
    "bio": "Board-certified dentist with specialization in cosmetic dentistry and orthodontics. DDS from Harvard School of Dental Medicine. 20+ years of experience.",
    "avatarUrl": "https://i.pravatar.cc/300?img=12",
    "timezone": "America/Chicago",
    "language": "en",
    "businessName": "Bright Smile Dental Clinic",
    "businessType": "Dental Clinic",
    "businessAddress": "321 Health Plaza, Chicago, IL 60601",
    "businessPhone": "+1 (555) 456-7890",
    "businessHours": {
      "monday": { "open": "08:00", "close": "17:00" },
      "tuesday": { "open": "08:00", "close": "17:00" },
      "wednesday": { "open": "08:00", "close": "17:00" },
      "thursday": { "open": "08:00", "close": "19:00" },
      "friday": { "open": "08:00", "close": "15:00" },
      "saturday": { "closed": true },
      "sunday": { "closed": true }
    },
    "emailNotifications": true,
    "smsNotifications": false,
    "pushNotifications": true,
    "marketingEmails": false
  }'

# User 4: Fitness Trainer
register_user \
  "alex.rodriguez@fitness.com" \
  "Alex Rodriguez" \
  "FitnessPro2024!@#$" \
  '{
    "phoneNumber": "+1 (555) 567-8901",
    "bio": "NASM Certified Personal Trainer and Nutrition Coach. Helping clients achieve their fitness goals through customized workout plans and nutritional guidance.",
    "avatarUrl": "https://i.pravatar.cc/300?img=33",
    "timezone": "America/Denver",
    "language": "en",
    "businessName": "Peak Performance Fitness",
    "businessType": "Fitness Training",
    "businessAddress": "555 Mountain View Rd, Denver, CO 80202",
    "businessPhone": "+1 (555) 567-8901",
    "businessHours": {
      "monday": { "open": "06:00", "close": "21:00" },
      "tuesday": { "open": "06:00", "close": "21:00" },
      "wednesday": { "open": "06:00", "close": "21:00" },
      "thursday": { "open": "06:00", "close": "21:00" },
      "friday": { "open": "06:00", "close": "21:00" },
      "saturday": { "open": "07:00", "close": "19:00" },
      "sunday": { "open": "08:00", "close": "18:00" }
    },
    "emailNotifications": true,
    "smsNotifications": true,
    "pushNotifications": true,
    "marketingEmails": true
  }'

# User 5: Massage Therapist
register_user \
  "lisa.martinez@massage.com" \
  "Lisa Martinez" \
  "MassagePro2024!@#$" \
  '{
    "phoneNumber": "+1 (555) 678-9012",
    "bio": "Licensed Massage Therapist specializing in deep tissue, Swedish, and sports massage. Certified in aromatherapy and hot stone techniques.",
    "avatarUrl": "https://i.pravatar.cc/300?img=20",
    "timezone": "America/Phoenix",
    "language": "en",
    "businessName": "Zen Massage & Wellness",
    "businessType": "Massage Therapy",
    "businessAddress": "888 Wellness Way, Phoenix, AZ 85001",
    "businessPhone": "+1 (555) 678-9012",
    "businessHours": {
      "monday": { "open": "09:00", "close": "19:00" },
      "tuesday": { "open": "09:00", "close": "19:00" },
      "wednesday": { "open": "09:00", "close": "19:00" },
      "thursday": { "open": "09:00", "close": "19:00" },
      "friday": { "open": "09:00", "close": "19:00" },
      "saturday": { "open": "10:00", "close": "18:00" },
      "sunday": { "closed": true }
    },
    "emailNotifications": true,
    "smsNotifications": true,
    "pushNotifications": false,
    "marketingEmails": false
  }'

# User 6: Auto Mechanic
register_user \
  "tom.anderson@autorepair.com" \
  "Tom Anderson" \
  "MechanicPro2024!@#$" \
  '{
    "phoneNumber": "+1 (555) 789-0123",
    "bio": "ASE Certified Master Technician with 25 years of experience. Specializing in diagnostics, engine repair, and preventive maintenance for all vehicle makes.",
    "avatarUrl": "https://i.pravatar.cc/300?img=51",
    "timezone": "America/Detroit",
    "language": "en",
    "businessName": "Precision Auto Repair",
    "businessType": "Auto Repair",
    "businessAddress": "999 Industrial Dr, Detroit, MI 48201",
    "businessPhone": "+1 (555) 789-0123",
    "businessHours": {
      "monday": { "open": "07:00", "close": "18:00" },
      "tuesday": { "open": "07:00", "close": "18:00" },
      "wednesday": { "open": "07:00", "close": "18:00" },
      "thursday": { "open": "07:00", "close": "18:00" },
      "friday": { "open": "07:00", "close": "18:00" },
      "saturday": { "open": "08:00", "close": "14:00" },
      "sunday": { "closed": true }
    },
    "emailNotifications": true,
    "smsNotifications": false,
    "pushNotifications": true,
    "marketingEmails": true
  }'

# User 7: Tutor
register_user \
  "jennifer.kim@tutoring.com" \
  "Jennifer Kim" \
  "TutorPro2024!@#$" \
  '{
    "phoneNumber": "+1 (555) 890-1234",
    "bio": "Experienced educator with MA in Mathematics Education. Specializing in SAT/ACT prep, algebra, calculus, and STEM tutoring. 98% student satisfaction rate.",
    "avatarUrl": "https://i.pravatar.cc/300?img=45",
    "timezone": "America/New_York",
    "language": "en",
    "businessName": "Academic Excellence Tutoring",
    "businessType": "Tutoring",
    "businessAddress": "147 Education Lane, Boston, MA 02108",
    "businessPhone": "+1 (555) 890-1234",
    "businessHours": {
      "monday": { "open": "15:00", "close": "21:00" },
      "tuesday": { "open": "15:00", "close": "21:00" },
      "wednesday": { "open": "15:00", "close": "21:00" },
      "thursday": { "open": "15:00", "close": "21:00" },
      "friday": { "open": "15:00", "close": "20:00" },
      "saturday": { "open": "09:00", "close": "17:00" },
      "sunday": { "open": "10:00", "close": "16:00" }
    },
    "emailNotifications": true,
    "smsNotifications": true,
    "pushNotifications": true,
    "marketingEmails": false
  }'

echo "✨ Done! Created 7 sample users with complete profiles."
echo ""
echo "Sample credentials:"
echo "  Email: sarah.johnson@barbershop.com"
echo "  Password: SecureBarber2024!@#"
echo ""
echo "You can login with any of the created users using their email and password."
