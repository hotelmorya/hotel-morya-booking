import { submitBookingAction } from "../src/lib/booking.actions";

async function runTests() {
  console.log("Running booking validation tests...\n");

  // Test 1: Future valid booking
  const res1 = await submitBookingAction({
    guestName: "Pravin Bagde",
    phone: "+91 98765 43210",
    checkIn: "2026-10-15",
    checkOut: "2026-10-17",
    guests: 2,
    stayType: "AC room",
    note: "Arranging family visit for temple darshan",
  });
  console.log("Test 1 (Valid booking):", res1.success ? `PASS (ref: ${res1.reference})` : `FAIL: ${res1.error}`);

  // Test 2: Past date
  const res2 = await submitBookingAction({
    guestName: "Pravin Bagde",
    phone: "+91 98765 43210",
    checkIn: "2020-01-01",
    checkOut: "2020-01-02",
    guests: 2,
    stayType: "AC room",
  });
  console.log("Test 2 (Past date rejection):", !res2.success ? `PASS (rejected: ${res2.error})` : "FAIL (allowed past date)");

  // Test 3: Checkout before Checkin
  const res3 = await submitBookingAction({
    guestName: "Pravin Bagde",
    phone: "+91 98765 43210",
    checkIn: "2026-10-20",
    checkOut: "2026-10-18",
    guests: 2,
    stayType: "AC room",
  });
  console.log("Test 3 (Checkout before checkin rejection):", !res3.success ? `PASS (rejected: ${res3.error})` : "FAIL (allowed invalid order)");

  // Test 4: Bot Honeypot
  const res4 = await submitBookingAction({
    guestName: "Bot",
    phone: "+91 98765 43210",
    checkIn: "2026-10-15",
    checkOut: "2026-10-17",
    guests: 2,
    stayType: "AC room",
    website: "https://spam-bot.com",
  });
  console.log("Test 4 (Honeypot rejection):", !res4.success ? `PASS (rejected: ${res4.error})` : "FAIL (allowed bot honeypot)");
}

runTests().catch(console.error);
