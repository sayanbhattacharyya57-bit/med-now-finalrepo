const bcrypt = require("bcryptjs");
const logger = require("./logger");

const seed = async () => {
  try {
    const User = require("../models/User");
    const Hospital = require("../models/Hospital");
    const Medicine = require("../models/Medicine");

    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      logger.info("Database already has data — skipping seed.");
      return;
    }

    logger.info("Seeding demo data…");

    const passwordHash = await bcrypt.hash("Password123", 12);

    const [patient, doctor, admin] = await User.insertMany([
      {
        name: "Priya Kumar",
        email: "patient@demo.com",
        phone: "9876543210",
        password: passwordHash,
        role: "patient",
        isVerified: true,
        language: "hi",
        patientProfile: {
          dateOfBirth: new Date("1990-05-14"),
          gender: "female",
          bloodGroup: "B+",
          allergies: ["Penicillin"],
          chronicConditions: ["Hypertension"],
          weight: 58,
          height: 162,
        },
      },
      {
        name: "Dr. Rajesh Sharma",
        email: "doctor@demo.com",
        phone: "9876543211",
        password: passwordHash,
        role: "doctor",
        isVerified: true,
        doctorProfile: {
          specialization: "General Medicine",
          licenseNumber: "MCI-UP-2018-45123",
          experience: 8,
          qualifications: ["MBBS - KGMU Lucknow (2016)", "MD General Medicine - SGPGI (2018)"],
          consultationFee: 200,
          isAvailable: true,
          availableSlots: [
            { day: "Mon", startTime: "09:00", endTime: "13:00", isBooked: false },
            { day: "Mon", startTime: "14:00", endTime: "17:00", isBooked: false },
            { day: "Tue", startTime: "09:00", endTime: "13:00", isBooked: false },
            { day: "Wed", startTime: "09:00", endTime: "13:00", isBooked: false },
            { day: "Thu", startTime: "09:00", endTime: "13:00", isBooked: false },
            { day: "Fri", startTime: "09:00", endTime: "13:00", isBooked: false },
            { day: "Sat", startTime: "10:00", endTime: "13:00", isBooked: false },
          ],
          languages: ["Hindi", "English"],
          bio: "Specializing in rural and community healthcare with 8 years of field experience.",
        },
      },
      {
        name: "Admin Suresh",
        email: "admin@demo.com",
        phone: "9876543212",
        password: passwordHash,
        role: "hospital_admin",
        isVerified: true,
      },
    ]);

    const hospital = await Hospital.create({
      name: "MedNow Rural Health Centre",
      registrationNumber: "UP-HOSP-2020-00123",
      type: "clinic",
      email: "hospital@mednow.health",
      phone: "0522-1234567",
      address: {
        street: "Station Road",
        city: "Rampur",
        state: "Uttar Pradesh",
        pincode: "244901",
        coordinates: { type: "Point", coordinates: [79.008, 28.8154] },
      },
      beds: { total: 30, available: 18, icu: 2, icuAvailable: 1, emergency: 5, emergencyAvailable: 3 },
      oxygen: { available: true, cylindersAvailable: 10, concentratorsAvailable: 2 },
      ambulances: { total: 2, available: 1 },
      facilities: ["emergency", "pharmacy", "telemedicine", "lab"],
      doctors: [doctor._id],
      admins: [admin._id],
      operatingHours: {
        is24x7: false,
        hours: [
          { day: "monday", open: "08:00", close: "20:00", isClosed: false },
          { day: "tuesday", open: "08:00", close: "20:00", isClosed: false },
          { day: "wednesday", open: "08:00", close: "20:00", isClosed: false },
          { day: "thursday", open: "08:00", close: "20:00", isClosed: false },
          { day: "friday", open: "08:00", close: "20:00", isClosed: false },
          { day: "saturday", open: "09:00", close: "16:00", isClosed: false },
          { day: "sunday", open: "10:00", close: "14:00", isClosed: true },
        ],
      },
      isActive: true,
      isVerified: true,
    });

    const medicines = [
      {
        name: "Paracetamol 500mg",
        genericName: "Acetaminophen",
        category: "tablet",
        manufacturer: "Sun Pharma",
        price: { mrp: 12 },
        stock: { quantity: 500, expiryDate: new Date("2027-12-31"), batchNumber: "SP-2024-001" },
        prescription: false,
        hospital: hospital._id,
        description: "Pain reliever and fever reducer, safe for adults and children.",
        dosage: "1–2 tablets every 4–6 hours. Max 8 tablets/day.",
        sideEffects: ["Nausea (rare)", "Liver damage in overdose"],
        activeIngredients: [{ name: "Paracetamol", strength: "500mg" }],
        isActive: true,
      },
      {
        name: "Amoxicillin 250mg",
        genericName: "Amoxicillin",
        category: "capsule",
        manufacturer: "Cipla",
        price: { mrp: 85 },
        stock: { quantity: 200, expiryDate: new Date("2027-06-30"), batchNumber: "CIP-2024-042" },
        prescription: true,
        hospital: hospital._id,
        description: "Broad-spectrum antibiotic for bacterial infections.",
        dosage: "1 capsule three times daily for 5–7 days.",
        sideEffects: ["Diarrhoea", "Rash", "Allergic reaction"],
        activeIngredients: [{ name: "Amoxicillin trihydrate", strength: "250mg" }],
        isActive: true,
      },
      {
        name: "Metformin 500mg",
        genericName: "Metformin HCl",
        category: "tablet",
        manufacturer: "Lupin",
        price: { mrp: 45 },
        stock: { quantity: 300, expiryDate: new Date("2027-09-30"), batchNumber: "LUP-2024-017" },
        prescription: true,
        hospital: hospital._id,
        description: "First-line treatment for type 2 diabetes.",
        dosage: "1 tablet twice daily with meals.",
        sideEffects: ["Nausea", "Diarrhoea"],
        activeIngredients: [{ name: "Metformin Hydrochloride", strength: "500mg" }],
        isActive: true,
      },
      {
        name: "Amlodipine 5mg",
        genericName: "Amlodipine besylate",
        category: "tablet",
        manufacturer: "Dr. Reddy's",
        price: { mrp: 60 },
        stock: { quantity: 250, expiryDate: new Date("2027-08-31"), batchNumber: "DR-2024-089" },
        prescription: true,
        hospital: hospital._id,
        description: "Calcium channel blocker for hypertension and angina.",
        dosage: "1 tablet once daily.",
        sideEffects: ["Oedema", "Headache", "Flushing"],
        activeIngredients: [{ name: "Amlodipine besylate", strength: "5mg" }],
        isActive: true,
      },
      {
        name: "ORS Powder",
        genericName: "Oral Rehydration Salts",
        category: "other",
        manufacturer: "Abbott India",
        price: { mrp: 15 },
        stock: { quantity: 800, expiryDate: new Date("2027-12-31"), batchNumber: "ABT-2024-200" },
        prescription: false,
        hospital: hospital._id,
        description: "Prevents dehydration from diarrhoea and vomiting.",
        dosage: "Dissolve 1 sachet in 1 litre of clean water. Sip frequently.",
        sideEffects: [],
        activeIngredients: [
          { name: "Sodium Chloride", strength: "2.6g/L" },
          { name: "Glucose", strength: "13.5g/L" },
        ],
        isActive: true,
      },
      {
        name: "Azithromycin 500mg",
        genericName: "Azithromycin",
        category: "tablet",
        manufacturer: "Zydus",
        price: { mrp: 120 },
        stock: { quantity: 150, expiryDate: new Date("2027-03-31"), batchNumber: "ZYD-2024-055" },
        prescription: true,
        hospital: hospital._id,
        description: "Antibiotic for respiratory and skin infections.",
        dosage: "1 tablet once daily for 3–5 days.",
        sideEffects: ["Nausea", "Diarrhoea"],
        activeIngredients: [{ name: "Azithromycin dihydrate", strength: "500mg" }],
        isActive: true,
      },
      {
        name: "Cetirizine 10mg",
        genericName: "Cetirizine HCl",
        category: "tablet",
        manufacturer: "UCB India",
        price: { mrp: 8 },
        stock: { quantity: 1000, expiryDate: new Date("2028-01-31"), batchNumber: "UCB-2024-311" },
        prescription: false,
        hospital: hospital._id,
        description: "Antihistamine for allergies and hay fever.",
        dosage: "1 tablet once daily, preferably at bedtime.",
        sideEffects: ["Drowsiness", "Dry mouth", "Headache"],
        activeIngredients: [{ name: "Cetirizine Hydrochloride", strength: "10mg" }],
        isActive: true,
      },
      {
        name: "Omeprazole 20mg",
        genericName: "Omeprazole",
        category: "capsule",
        manufacturer: "AstraZeneca",
        price: { mrp: 35 },
        stock: { quantity: 400, expiryDate: new Date("2027-10-31"), batchNumber: "AZ-2024-078" },
        prescription: false,
        hospital: hospital._id,
        description: "Proton pump inhibitor for acid reflux and peptic ulcers.",
        dosage: "1 capsule once daily before breakfast.",
        sideEffects: ["Headache", "Diarrhoea", "Nausea"],
        activeIngredients: [{ name: "Omeprazole", strength: "20mg" }],
        isActive: true,
      },
    ];

    await Medicine.insertMany(medicines);

    logger.info("Demo seed complete:");
    logger.info("  patient@demo.com / Password123  (Patient — Priya Kumar)");
    logger.info("  doctor@demo.com  / Password123  (Doctor — Dr. Rajesh Sharma)");
    logger.info("  admin@demo.com   / Password123  (Hospital Admin — Suresh)");
    logger.info(`  1 hospital, ${medicines.length} medicines seeded`);
  } catch (err) {
    logger.error(`Seeder failed: ${err.message}`);
  }
};

module.exports = seed;
