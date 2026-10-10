import { HOTEL } from "@/lib/site";

interface HotelJsonLdProps {
  locale: string;
}

export function HotelJsonLd({ locale }: HotelJsonLdProps) {
  const isMr = locale === "mr";
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://hotel-morya-booking.vercel.app"
  ).replace(/\/$/, "");

  const hotelName = isMr ? "हॉटेल मोरया लॉजिंग आदमापूर" : "Hotel Morya Lodging Admapur";
  const hotelDescription = isMr
    ? "श्री संत बाळूमामा मंदिरापासून फक्त २०० मीटर अंतरावर स्वच्छ AC खोल्या, नॉन-AC खोल्या आणि ५०+ भाविकांचा ग्रुप हॉल. २४ तास गरम पाणी, लिफ्ट व खाजगी पार्किंग सोय."
    : "Stay at Hotel Morya Lodging in Admapur, Kolhapur, located just 200 metres from Shri Sant Balumama Temple Gate. Clean AC rooms, non-AC rooms, 50+ pilgrim dormitory, 24/7 hot water, elevator, and secure parking.";

  const hotelSchema = {
    "@context": "https://schema.org",
    "@type": ["Hotel", "LodgingBusiness"],
    "@id": `${baseUrl}#hotel`,
    name: hotelName,
    alternateName: [
      "Hotel Morya",
      "हॉटेल मोरया",
      "Hotel Morya Lodging",
      "Hotel Morya Admapur",
      "हॉटेल मोरया लॉजिंग आदमापूर",
    ],
    description: hotelDescription,
    url: `${baseUrl}/${locale}`,
    telephone: `+91${HOTEL.phones[0]}`,
    email: HOTEL.email,
    priceRange: "₹800 - ₹2,500",
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, UPI, QR Code, Net Banking",
    image: [
      `${baseUrl}/images/hotel-morya-exterior-02.png`,
      `${baseUrl}/images/hotel-morya-exterior-01.png`,
      `${baseUrl}/images/hotel-morya-reception-lobby.png`,
      `${baseUrl}/images/hotel-morya-ac-room.png`,
      `${baseUrl}/images/hotel-morya-dormitory.png`,
      `${baseUrl}/images/balumama-temple.jpg`,
    ],
    logo: `${baseUrl}/images/morya-logo.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: HOTEL.address.street,
      addressLocality: HOTEL.address.village,
      addressRegion: HOTEL.address.state,
      postalCode: HOTEL.address.postalCode,
      addressCountry: HOTEL.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: HOTEL.geo.lat,
      longitude: HOTEL.geo.lng,
    },
    hasMap: "https://www.google.com/maps/place/Hotel+Morya+Lodging/@16.4062602,74.1569327,17z",
    checkinTime: "09:00:00+05:30",
    checkoutTime: "10:00:00+05:30",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: HOTEL.reviews.rating,
      reviewCount: HOTEL.reviews.count,
      bestRating: "5",
      worstRating: "1",
    },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Free Guest Parking", value: true },
      { "@type": "LocationFeatureSpecification", name: "24/7 Hot Geyser Water", value: true },
      { "@type": "LocationFeatureSpecification", name: "Air Conditioning", value: true },
      { "@type": "LocationFeatureSpecification", name: "Passenger Lift / Elevator", value: true },
      { "@type": "LocationFeatureSpecification", name: "Generator Power Backup", value: true },
      { "@type": "LocationFeatureSpecification", name: "CCTV Security Surveillance", value: true },
      { "@type": "LocationFeatureSpecification", name: "200m Walking Distance to Temple", value: true },
      { "@type": "LocationFeatureSpecification", name: "Group Dormitory Hall", value: true },
      { "@type": "LocationFeatureSpecification", name: "Daily Housekeeping", value: true },
    ],
    containsPlace: [
      {
        "@type": "HotelRoom",
        name: isMr ? "डिलक्स AC रूम" : "Deluxe AC Rooms",
        description: isMr
          ? "एअर कंडिशन, अटॅच्ड बाथरूम, २४ तास गरम पाणी व स्वच्छ गाद्या."
          : "Air-conditioned private room with attached modern bathroom, 24/7 hot water, clean linens, and LED TV.",
        occupancy: { "@type": "QuantitativeValue", minValue: 1, maxValue: 4 },
      },
      {
        "@type": "HotelRoom",
        name: isMr ? "नॉन-AC रूम" : "Comfortable Non-AC Rooms",
        description: isMr
          ? "नैसर्गिक हवा, अत्यंत स्वच्छ व वाजवी दरातील खाजगी खोली."
          : "Naturally ventilated, pristine hygienic non-AC room with attached bathroom and continuous hot water.",
        occupancy: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3 },
      },
      {
        "@type": "HotelRoom",
        name: isMr ? "भाविकांचा ग्रुप हॉल (डॉर्मिटरी)" : "Pilgrim Group Dormitory",
        description: isMr
          ? "मोठ्या कुटुंबांसाठी व भाविकांच्या ग्रुपसाठी ५० लोकांपर्यंतचा प्रशस्त हॉल."
          : "Spacious dormitory hall accommodating 10 to 50 pilgrims with multiple attached washrooms.",
        occupancy: { "@type": "QuantitativeValue", minValue: 10, maxValue: 50 },
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: isMr
          ? "हॉटेल मोरया लॉजिंग श्री संत बाळूमामा मंदिरापासून किती अंतरावर आहे?"
          : "How far is Hotel Morya Lodging from Shri Sant Balumama Temple, Admapur?",
        acceptedAnswer: {
          "@type": "Answer",
          text: isMr
            ? "हॉटेल मोरया हे श्री संत बाळूमामा मंदिराच्या मुख्य कमानीपासून फक्त २०० मीटर अंतरावर (२ मिनिटांचे अंतर) स्थित आहे. वृद्ध व लहान मुलांसह सहज चालत जाता येते."
            : "Hotel Morya is located just 200 metres (approx. 2 minutes walk) from the main gate of Shri Sant Balumama Temple in Admapur.",
        },
      },
      {
        "@type": "Question",
        name: isMr
          ? "हॉटेल मोरयामध्ये चेक-इन आणि चेक-आऊटची वेळ काय आहे?"
          : "What are the check-in and check-out timings at Hotel Morya?",
        acceptedAnswer: {
          "@type": "Answer",
          text: isMr
            ? "हॉटेलमध्ये चेक-इन वेळ सकाळी ९:०० आणि चेक-आऊट वेळ सकाळी १०:०० आहे. खोली उपलब्धतेनुसार अर्ली चेक-इन शक्य आहे."
            : "Standard check-in is 9:00 AM and check-out is 10:00 AM IST. Early check-in or late check-out is subject to availability.",
        },
      },
      {
        "@type": "Question",
        name: isMr
          ? "मोठ्या भाविक मंडळांसाठी ग्रुप हॉल / डॉर्मिटरी उपलब्ध आहे का?"
          : "Is group accommodation or dormitory available for large pilgrim groups?",
        acceptedAnswer: {
          "@type": "Answer",
          text: isMr
            ? "होय, मोठ्या कुटुंबांसाठी आणि भाविक मंडळांसाठी ५०+ लोकांचा प्रशस्त ग्रुप हॉल (डॉर्मिटरी) उपलब्ध आहे, ज्यामध्ये अनेक अटॅच्ड वॉशरुम्स आणि २४ तास गरम पाण्याची सोय आहे."
            : "Yes, Hotel Morya provides a spacious group dormitory hall accommodating up to 50 pilgrims, with multiple attached washrooms and continuous hot water.",
        },
      },
      {
        "@type": "Question",
        name: isMr
          ? "गाड्यांसाठी आणि बसेससाठी पार्किंगची सोय आहे का?"
          : "Is parking available for cars and tourist buses?",
        acceptedAnswer: {
          "@type": "Answer",
          text: isMr
            ? "होय, हॉटेलच्या आवारात सर्व प्रकारच्या चारचाकी गाड्या व प्रवासी बसेससाठी सुरक्षित खाजगी पार्किंग उपलब्ध आहे."
            : "Yes, dedicated on-site secure parking is available for cars and group tourist buses visiting Admapur.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
