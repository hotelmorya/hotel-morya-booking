'use client'

import { useState } from 'react'
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// The admin panel is English-only everywhere EXCEPT this page (CLAUDE.md §15):
// the owner and staff near Balumama Temple read Marathi/Hindi more comfortably,
// so the help topics are offered in all three languages.

type Lang = 'en' | 'mr' | 'hi'

type Topic = {
  q: Record<Lang, string>
  a: Record<Lang, string[]>
}

// Hindi was dropped as a supported language; only English + Marathi are offered.
// (Topic data may still contain unused `hi` strings — harmless, never selected.)
const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'mr', label: 'मराठी' },
]

const TOPICS: Topic[] = [
  {
    q: {
      en: 'How do I take a walk-in or phone booking?',
      mr: 'वॉक-इन किंवा फोन बुकिंग कशी करावी?',
      hi: 'वॉक-इन या फोन बुकिंग कैसे करें?',
    },
    a: {
      en: [
        'Open Bookings and tap “New booking”.',
        'Search the guest by phone — if they are new, fill their name and phone to create them.',
        'Pick the dates, room type and number of rooms; the price fills in automatically.',
        'Save. The booking starts as Pending. Record an advance payment or tap “Confirm” to confirm it.',
      ],
      mr: [
        'बुकिंग्ज उघडा आणि “New booking” दाबा.',
        'पाहुण्याला फोन नंबरने शोधा — नवीन असल्यास नाव व फोन भरून नोंदवा.',
        'तारखा, रूम प्रकार व रूम संख्या निवडा; किंमत आपोआप भरली जाते.',
        'सेव्ह करा. बुकिंग “Pending” अवस्थेत सुरू होते. आगाऊ रक्कम नोंदवा किंवा “Confirm” दाबून निश्चित करा.',
      ],
      hi: [
        'बुकिंग्स खोलें और “New booking” दबाएँ.',
        'मेहमान को फ़ोन नंबर से खोजें — नया हो तो नाम और फ़ोन भरकर जोड़ें.',
        'तारीख़ें, रूम प्रकार और रूम संख्या चुनें; क़ीमत अपने आप भर जाती है.',
        'सेव करें. बुकिंग “Pending” से शुरू होती है. अग्रिम राशि दर्ज करें या “Confirm” दबाकर पक्की करें.',
      ],
    },
  },
  {
    q: {
      en: 'How do I check a guest in and out?',
      mr: 'पाहुण्याचे चेक-इन व चेक-आउट कसे करावे?',
      hi: 'मेहमान का चेक-इन और चेक-आउट कैसे करें?',
    },
    a: {
      en: [
        'Open the booking. When the guest arrives, tap “Check in” and assign a room for each line.',
        'The room turns Occupied automatically.',
        'When they leave, tap “Check out”. The room moves to Cleaning so housekeeping can prepare it.',
      ],
      mr: [
        'बुकिंग उघडा. पाहुणा आल्यावर “Check in” दाबा आणि प्रत्येक ओळीसाठी रूम नेमा.',
        'रूम आपोआप “Occupied” होते.',
        'पाहुणा गेल्यावर “Check out” दाबा. रूम “Cleaning” मध्ये जाते जेणेकरून साफसफाई करता येईल.',
      ],
      hi: [
        'बुकिंग खोलें. मेहमान के आने पर “Check in” दबाएँ और हर लाइन के लिए रूम तय करें.',
        'रूम अपने आप “Occupied” हो जाता है.',
        'जाने पर “Check out” दबाएँ. रूम “Cleaning” में चला जाता है ताकि सफ़ाई हो सके.',
      ],
    },
  },
  {
    q: {
      en: 'How do I record a payment or give a discount?',
      mr: 'पेमेंट कसे नोंदवावे किंवा सूट कशी द्यावी?',
      hi: 'भुगतान कैसे दर्ज करें या छूट कैसे दें?',
    },
    a: {
      en: [
        'Open the booking and tap “Add payment”. Enter the amount and method (cash, UPI, card, bank).',
        'Partial and split payments are supported — the balance updates automatically.',
        'Payments cannot be edited or deleted to keep accounts honest; add a correcting entry instead.',
        'A discount needs a reason (manager/admin only) and is shown separately from collected revenue in Reports.',
      ],
      mr: [
        'बुकिंग उघडा आणि “Add payment” दाबा. रक्कम व पद्धत (cash, UPI, card, bank) भरा.',
        'अंशतः व विभागून पेमेंट चालते — शिल्लक आपोआप अपडेट होते.',
        'खाती प्रामाणिक राहावीत म्हणून पेमेंट बदलता/हटवता येत नाही; त्याऐवजी दुरुस्तीची नोंद करा.',
        'सूटीसाठी कारण लागते (फक्त मॅनेजर/अ‍ॅडमिन) आणि ती रिपोर्टमध्ये वसूल रकमेपासून वेगळी दिसते.',
      ],
      hi: [
        'बुकिंग खोलें और “Add payment” दबाएँ. राशि और तरीक़ा (cash, UPI, card, bank) भरें.',
        'आंशिक और विभाजित भुगतान चलते हैं — शेष अपने आप अपडेट होता है.',
        'खाते सही रहें इसलिए भुगतान बदला/हटाया नहीं जा सकता; इसके बजाय सुधार प्रविष्टि जोड़ें.',
        'छूट के लिए कारण ज़रूरी है (केवल मैनेजर/एडमिन) और रिपोर्ट में यह वसूली से अलग दिखती है.',
      ],
    },
  },
  {
    q: {
      en: 'What do the room colours mean?',
      mr: 'रूमचे रंग काय दर्शवतात?',
      hi: 'रूम के रंग क्या दर्शाते हैं?',
    },
    a: {
      en: [
        'Green = Available, Cyan = Arriving today, Violet = Occupied, Amber = Cleaning, Slate = Repair/Maintenance.',
        'A dashed amber block on the calendar is a temporary online hold (it disappears after 5 minutes if unpaid).',
      ],
      mr: [
        'हिरवा = उपलब्ध, निळसर = आज येणारे, जांभळा = भरलेले, पिवळा = साफसफाई, करडा = दुरुस्ती.',
        'कॅलेंडरवरील तुटक पिवळा भाग म्हणजे तात्पुरते ऑनलाइन होल्ड (पैसे न आल्यास ५ मिनिटांत निघून जाते).',
      ],
      hi: [
        'हरा = उपलब्ध, सियान = आज आने वाले, बैंगनी = भरा हुआ, अंबर = सफ़ाई, स्लेट = मरम्मत.',
        'कैलेंडर पर टूटी अंबर पट्टी अस्थायी ऑनलाइन होल्ड है (भुगतान न होने पर ५ मिनट में हट जाती है).',
      ],
    },
  },
  {
    q: {
      en: 'How do I see reports and take a backup?',
      mr: 'रिपोर्ट कशी पाहावी व बॅकअप कसा घ्यावा?',
      hi: 'रिपोर्ट कैसे देखें और बैकअप कैसे लें?',
    },
    a: {
      en: [
        'Open Reports and pick a date range to see revenue, occupancy, ADR and RevPAR.',
        'Tap “Backup now” to download an Excel file of bookings, guests and payments. A copy is also emailed weekly.',
      ],
      mr: [
        'रिपोर्ट्स उघडा व तारखांची श्रेणी निवडा — महसूल, ऑक्युपन्सी, ADR व RevPAR दिसेल.',
        '“Backup now” दाबा — बुकिंग्ज, पाहुणे व पेमेंटची Excel फाइल डाउनलोड होते. आठवड्याला ईमेलनेही प्रत येते.',
      ],
      hi: [
        'रिपोर्ट्स खोलें और तारीख़ सीमा चुनें — राजस्व, ऑक्युपेंसी, ADR और RevPAR दिखेगा.',
        '“Backup now” दबाएँ — बुकिंग, मेहमान और भुगतान की Excel फ़ाइल डाउनलोड होती है. साप्ताहिक ईमेल भी आता है.',
      ],
    },
  },
  {
    q: {
      en: 'I am stuck. How do I get help?',
      mr: 'अडचण आली आहे. मदत कशी मिळेल?',
      hi: 'समस्या आ गई है. मदद कैसे लें?',
    },
    a: {
      en: [
        'Most actions can be undone — cancelling a booking or deleting a payment only hides it; nothing is lost.',
        'If something looks wrong, refresh the page first. If it persists, contact your administrator.',
      ],
      mr: [
        'बहुतेक क्रिया मागे घेता येतात — बुकिंग रद्द करणे किंवा पेमेंट हटवणे फक्त लपवते; काहीही नष्ट होत नाही.',
        'काही चुकीचे दिसल्यास आधी पेज रिफ्रेश करा. तरीही राहिल्यास तुमच्या अ‍ॅडमिनशी संपर्क करा.',
      ],
      hi: [
        'अधिकांश क्रियाएँ वापस ली जा सकती हैं — बुकिंग रद्द करना या भुगतान हटाना केवल छिपाता है; कुछ नष्ट नहीं होता.',
        'कुछ ग़लत दिखे तो पहले पेज रिफ़्रेश करें. फिर भी बना रहे तो अपने एडमिन से संपर्क करें.',
      ],
    },
  },
]

const INTRO: Record<Lang, string> = {
  en: 'Quick answers to the everyday tasks. Pick your language above.',
  mr: 'रोजच्या कामांची झटपट उत्तरे. वर तुमची भाषा निवडा.',
  hi: 'रोज़मर्रा के कामों के झटपट जवाब. ऊपर अपनी भाषा चुनें.',
}

export function HelpContent() {
  const [lang, setLang] = useState<Lang>('en')

  return (
    <div className="flex flex-col gap-5">
      <Tabs value={lang} onValueChange={(v) => setLang(v as Lang)}>
        <TabsList>
          {LANGS.map((l) => (
            <TabsTrigger key={l.value} value={l.value}>
              {l.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <p className="text-body text-text-secondary">{INTRO[lang]}</p>

      <Accordion multiple={false} className="w-full">
        {TOPICS.map((t, i) => (
          <AccordionItem key={i} value={`topic-${i}`}>
            <AccordionTrigger className="text-left">{t.q[lang]}</AccordionTrigger>
            <AccordionPanel>
              <ul className="flex list-disc flex-col gap-2 pl-5 text-body text-text-secondary">
                {t.a[lang].map((line, j) => (
                  <li key={j}>{line}</li>
                ))}
              </ul>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
