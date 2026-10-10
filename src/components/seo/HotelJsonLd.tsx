import { HOTEL, directionsHref, waHref } from "@/lib/site";

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
    "@id": `${baseUrl}/#hotel`,
    name: hotelName,
    alternateName: [
      "Hotel Morya",
      "हॉटेल मोरया",
      "Hotel Morya Lodging",
      "Hotel Morya Admapur",
      "Hotel Morya Adamapur",
      "Morya Lodging Admapur",
      "Morya Lodge Admapur",
      "Morya Lodging",
      "हॉटेल मोरया लॉजिंग आदमापूर",
    ],
    description: hotelDescription,
    url: `${baseUrl}/${locale}`,
    telephone: `+91${HOTEL.phones[0]}`,
    email: HOTEL.email,
    priceRange: "₹800 - ₹2,500",
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, UPI, QR Code, Net Banking",
    sameAs: [
      directionsHref,
      "https://maps.google.com/?cid=2413813958999557653",
      waHref(),
    ],
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
    hasMap: directionsHref,
    checkinTime: "09:00:00+05:30",
    checkoutTime: "10:00:00+05:30",
    availableLanguage: ["English", "Marathi"],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
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

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    name: HOTEL.name,
    url: baseUrl,
    inLanguage: ["en", "mr"],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: isMr ? "मुख्यपृष्ठ" : "Home",
        item: `${baseUrl}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: isMr ? "खोल्या आणि दर" : "Stays & Tariff",
        item: `${baseUrl}/${locale}#stays`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: isMr ? "बुकिंग" : "Book Stay",
        item: `${baseUrl}/${locale}/book`,
      },
    ],
  };

  const templeSchema = {
    "@context": "https://schema.org",
    "@type": ["PlaceOfWorship", "TouristAttraction"],
    "@id": `${baseUrl}/#temple`,
    name: isMr
      ? "श्री संत बाळूमामा समाधी मंदिर आदमापूर"
      : "Shri Sant Balumama Samadhi Temple Admapur",
    description: isMr
      ? "आदमापूर येथील श्री संत बाळूमामांचे पवित्र समाधी मंदिर, जे हॉटेल मोरयापासून फक्त २०० मीटर (२ मिनिटांच्या) अंतरावर आहे."
      : "The sacred samadhi temple of Shri Sant Balumama in Admapur, Kolhapur, located just 200m walking distance from Hotel Morya.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Near Shri Balumama Temple Gate",
      addressLocality: "Admapur",
      addressRegion: "Maharashtra",
      postalCode: "416208",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: HOTEL.geo.lat,
      longitude: HOTEL.geo.lng,
    },
  };

  const festivalEvents = [
    {
      "@context": "https://schema.org",
      "@type": "Event",
      name: isMr ? "श्री संत बाळूमामा जयंती उत्सव" : "Shri Sant Balumama Jayanti Utsav",
      description: isMr
        ? "अश्विन शुद्ध द्वादशीला आदमापूर येथील समाधी मंदिरात साजरी होणारी श्री बाळूमामांची जयंती."
        : "Birth anniversary celebration of Shri Sant Balumama at Samadhi Temple in Admapur.",
      startDate: "2026-10-23",
      endDate: "2026-10-23",
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@id": `${baseUrl}/#temple`,
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: `${baseUrl}/${locale}#temple`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Event",
      name: isMr
        ? "श्री संत बाळूमामा वार्षिक भंडारा उत्सव"
        : "Shri Sant Balumama Annual Bhandara Utsav",
      description: isMr
        ? "आदमापूर येथे लाखो भाविकांच्या उपस्थितीत होणारा ऐतिहासिक हळदीचा भंडारा उत्सव."
        : "Annual Bhandara festival in Admapur drawing lakhs of devotees as sacred turmeric is offered.",
      startDate: "2027-03-05",
      endDate: "2027-03-07",
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@id": `${baseUrl}/#temple`,
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: `${baseUrl}/${locale}#temple`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Event",
      name: isMr
        ? "श्री संत बाळूमामा पुण्यतिथी सोहळा"
        : "Shri Sant Balumama Punyatithi Observance",
      description: isMr
        ? "श्रावण वद्य चतुर्थीला आदमापूर येथे होणारा श्री संत बाळूमामांचा महासमाधी सोहळा."
        : "Annual observance of Shri Sant Balumama Samadhi in Admapur on Shravan Vadya Chaturthi.",
      startDate: "2027-08-22",
      endDate: "2027-08-22",
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@id": `${baseUrl}/#temple`,
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: `${baseUrl}/${locale}#temple`,
      },
    },
  ];

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

  const schemas = [
    hotelSchema,
    webSiteSchema,
    breadcrumbSchema,
    templeSchema,
    ...festivalEvents,
    faqSchema,
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
    />
  );
}
