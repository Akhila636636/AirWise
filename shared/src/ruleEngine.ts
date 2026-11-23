import type {
  HouseholdProfile,
  AirQualitySummary,
  DailyPlan,
  Recommendation,
  Language,
} from './types.js';
import { t } from './i18n.js';

/**
 * Helper to build a localized recommendation from catalog action IDs.
 */
function createRecommendation(
  actionId: string,
  lang: Language,
  difficulty: 'easy' | 'medium' | 'hard',
  cost: 'free' | 'low' | 'medium',
  stepsKeys: string[],
  whyKey: string,
): Recommendation {
  const title = t(`action.${actionId}`, lang);
  const steps = stepsKeys.map((k) => t(k, lang));
  const whyItHelps = t(whyKey, lang);

  return {
    actionId,
    title,
    steps,
    whyItHelps,
    difficulty,
    cost,
  };
}

/**
 * Deterministic fallback rule engine that produces a schema-valid DailyPlan
 * based on the household profile, air quality summary, and preferred language.
 *
 * Used when the LLM is unavailable, times out, or fails schema validation.
 */
export function generateRulePlan(
  profile: HouseholdProfile,
  airSummary: AirQualitySummary,
): DailyPlan {
  const lang = profile.language || 'en';
  const aqi = airSummary.current.usAqi;
  const isHighAqi = aqi >= 150;

  // 1. Routine recommendations (Morning, Afternoon, Evening)
  const morning: Recommendation[] = [];
  const afternoon: Recommendation[] = [];
  const evening: Recommendation[] = [];

  // Morning
  if (isHighAqi) {
    morning.push(
      createRecommendation(
        'close_windows_peak_hours',
        lang,
        'easy',
        'free',
        [
          lang === 'hi'
            ? 'सुबह 6 से 10 बजे के बीच खिड़कियां बंद रखें।'
            : lang === 'te'
              ? 'ఉదయం 6 నుండి 10 గంటల మధ్య కిటికీలు మూసి ఉంచండి.'
              : 'Keep windows shut between 6 AM and 10 AM.',
          lang === 'hi'
            ? 'ताजी हवा के लिए शाम या दोपहर की प्रतीक्षा करें।'
            : lang === 'te'
              ? 'తాజా గాలి కోసం మధ్యాహ్నం లేదా సాయంత్రం వరకు వేచి ఉండండి.'
              : 'Wait for afternoon ventilation window if AQI improves.',
        ],
        lang === 'hi'
          ? 'सुबह ठंडी हवा में प्रदूषण जमीन के पास जम जाता है।'
          : lang === 'te'
            ? 'ఉదయపు చల్లని గాలిలో కాలుష్యం భూమికి దగ్గరగా ఉంటుంది.'
            : 'Early morning thermal inversion traps high pollution near ground level.',
      ),
    );
  } else {
    morning.push(
      createRecommendation(
        'ventilate_low_pm_window',
        lang,
        'easy',
        'free',
        [
          lang === 'hi'
            ? 'सर्वश्रेष्ठ वेंटिलेशन समय पर खिड़कियां 15-20 मिनट खोलें।'
            : lang === 'te'
              ? 'ఉత్తమ వెంటిలేషన్ సమయంలో 15-20 నిమిషాలు కిటికీలు తెరవండి.'
              : 'Open cross-ventilation windows for 15-20 minutes.',
          lang === 'hi'
            ? 'हवा का प्रवाह बढ़ाने के लिए पंखे चलाएं।'
            : lang === 'te'
              ? 'గాలి ప్రవాహం పెంచడానికి ఫ్యాన్లు వాడండి.'
              : 'Use ceiling fans to circulate clean air throughout rooms.',
        ],
        lang === 'hi'
          ? 'कम प्रदूषण घंटों में वेंटिलेशन से इनडोर CO2 कम होता है।'
          : lang === 'te'
            ? 'తక్కువ కాలుష్య సమయాల్లో వెంటిలేషన్ ఇన్డోర్ CO2 తగ్గిస్తుంది.'
            : 'Airing rooms during low pollution periods flushes indoor carbon dioxide safely.',
      ),
    );
  }

  if (profile.commuteMode !== 'work-from-home' && profile.commuteMinutesPerDay > 0) {
    if (isHighAqi) {
      morning.push(
        createRecommendation(
          'use_n95_commute',
          lang,
          'easy',
          'low',
          [
            lang === 'hi'
              ? 'घर से निकलते ही N95 मास्क पहनें और नाक की क्लिप दबाएं।'
              : lang === 'te'
                ? 'ఇంటి నుండి బయలుదేరేటప్పుడు N95 మాస్క్ ధరించండి.'
                : 'Put on a well-fitted N95 mask before stepping outside.',
            lang === 'hi'
              ? 'मास्क के किनारों से हवा का रिसाव न होने दें।'
              : lang === 'te'
                ? 'మాస్క్ అంచులను సరిగ్గా సీల్ చేయండి.'
                : 'Ensure tight seal around nose bridge and chin without gaps.',
          ],
          lang === 'hi'
            ? 'N95 मास्क 80% से अधिक हानिकारक कणों को रोकता है।'
            : lang === 'te'
              ? 'N95 మాస్క్ 80% కంటే ఎక్కువ కణాలను నిరోధిస్తుంది.'
              : 'N95 filtration blocks over 80% of fine inhalable particulate matter during transit.',
        ),
      );
    }
  }

  // Afternoon
  if (isHighAqi && (profile.hasChildren || profile.hasSensitiveMembers)) {
    afternoon.push(
      createRecommendation(
        'limit_outdoor_children',
        lang,
        'easy',
        'free',
        [
          lang === 'hi'
            ? 'बच्चों और संवेदनशील सदस्यों को दोपहर में घर के अंदर रखें।'
            : lang === 'te'
              ? 'పిల్లలను మరియు వృద్ధులను మధ్యాహ్నం ఇంట్లోనే ఉంచండి.'
              : 'Keep children and sensitive members indoors during peak hours.',
          lang === 'hi'
            ? 'इनडोर बोर्ड गेम या पढ़ाई की गतिविधियां चुनें।'
            : lang === 'te'
              ? 'ఇండోర్ ఆటలు లేదా అధ్యయనం ఎంచుకోండి.'
              : 'Engage in indoor quiet play, reading, or arts activities.',
        ],
        lang === 'hi'
          ? 'बच्चों की सांस लेने की गति तेज होती है, जिससे वे अधिक प्रभावित होते हैं।'
          : lang === 'te'
            ? 'పిల్లల ఊపిరితిత్తులు వేగంగా శ్వాసిస్తాయి, కనుక ఎక్కువ ప్రభావం ఉంటుంది.'
            : 'Children inhale more air per pound of body weight, making exposure risk higher.',
      ),
    );
  } else {
    afternoon.push(
      createRecommendation(
        'shift_exercise_indoors',
        lang,
        'medium',
        'free',
        [
          lang === 'hi'
            ? 'व्यायाम और योग घर के अंदर या जिम में करें।'
            : lang === 'te'
              ? 'వ్యాయామం మరియు యోగా ఇంట్లోనే చేయండి.'
              : 'Conduct workout routines, stretching, or yoga inside closed rooms.',
          lang === 'hi'
            ? 'तीव्र कार्डियो की जगह हल्का व्यायाम करें।'
            : lang === 'te'
              ? 'తీవ్రమైన కార్డియో కాకుండా తేలికపాటి వ్యాయామం చేయండి.'
              : 'Substitute intense cardio with light strength or flexibility training.',
        ],
        lang === 'hi'
          ? 'बाहरी व्यायाम से भारी मात्रा में प्रदूषक फेफड़ों में खिंचते हैं।'
          : lang === 'te'
            ? 'బయట వ్యాయామం వల్ల ఎక్కువ కాలుష్యం ఊపిరితిత్తుల్లోకి వెళ్తుంది.'
            : 'Heavy breathing during outdoor exertion multiplies pollutant intake 3 to 5 times.',
      ),
    );
  }

  // Evening
  if (profile.hasAirPurifier) {
    evening.push(
      createRecommendation(
        'run_purifier_bedroom',
        lang,
        'easy',
        'low',
        [
          lang === 'hi'
            ? 'सोने से 30 मिनट पहले बेडरूम का प्यूरीफायर चालू करें।'
            : lang === 'te'
              ? 'పడుకోవడానికి 30 నిమిషాల ముందు ప్యూరిఫైయర్ ఆన్ చేయండి.'
              : 'Turn on HEPA purifier in bedroom 30 minutes before sleep.',
          lang === 'hi'
            ? 'कमरे के दरवाजे और खिड़कियां पूरी तरह बंद रखें।'
            : lang === 'te'
              ? 'గది తలుపులు, కిటికీలు పూర్తిగా మూసి ఉంచండి.'
              : 'Keep bedroom doors and windows firmly shut for full filtration cycle.',
        ],
        lang === 'hi'
          ? 'रात भर स्वच्छ हवा मिलने से फेफड़ों को आराम और स्वास्थ्य लाभ होता है।'
          : lang === 'te'
            ? 'రాత్రిపూట స్వచ్ఛమైన గాలి ఊపిరితిత్తులను రక్షిస్తుంది.'
            : 'Continuous nighttime clean air exposure allows respiratory tissue recovery.',
      ),
    );
  } else {
    evening.push(
      createRecommendation(
        'seal_gaps_doors',
        lang,
        'medium',
        'low',
        [
          lang === 'hi'
            ? 'दरवाजों और खिड़कियों की दरारों पर गीला कपड़ा या सील पट्टी लगाएं।'
            : lang === 'te'
              ? 'తలుపులు, కిటికీల సందులను తడి గుడ్డ లేదా ఫోమ్ స్ట్రిప్స్‌తో మూయండి.'
              : 'Place rolled damp towels or foam weather-strips under entry doors.',
          lang === 'hi'
            ? 'शाम को बाहर से आने वाले धुएं को घर में आने से रोकें।'
            : lang === 'te'
              ? 'సాయంత్రం పొగ లోపలికి రాకుండా నిరోధించండి.'
              : 'Ensure exhaust vents have one-way flaps to stop back-drafting.',
        ],
        lang === 'hi'
          ? 'दरारें सील करने से बाहरी धुएं का प्रवेश 30-40% तक कम होता है।'
          : lang === 'te'
            ? 'సందులను మూయడం వల్ల బయటి పొగ ప్రవేశం 30-40% తగ్గుతుంది.'
            : 'Sealing infiltration gaps blocks cold smog seepage into warm living spaces.',
      ),
    );
  }

  // 2. Indoor Air Quality Hacks
  const indoor: Recommendation[] = [];
  indoor.push(
    createRecommendation(
      'avoid_dry_sweeping',
      lang,
      'easy',
      'free',
      [
        lang === 'hi'
          ? 'सूखा झाड़ू लगाने की जगह गीला पोछा इस्तेमाल करें।'
          : lang === 'te'
            ? 'పొడి చీపురుకు బదులు తడి మాప్ వాడండి.'
            : 'Use micro-fiber damp mopping instead of traditional dry sweeping.',
        lang === 'hi'
          ? 'धूल को हवा में उड़ने से बचाने के लिए तुरंत साफ करें।'
          : lang === 'te'
            ? 'ధూళి గాలిలోకి ఎగరకుండా వెంటనే శుభ్రం చేయండి.'
            : 'Wipe horizontal surfaces with a damp cloth rather than dry dusting.',
      ],
      lang === 'hi'
        ? 'सूखी झाड़ू से जमीन की महीन धूल हवा में घंटों तक तैरती रहती है।'
        : lang === 'te'
          ? 'పొడి చీపురు వల్ల ధూళి గంటల తరబడి గాలిలో తేలుతూ ఉంటుంది.'
          : 'Dry sweeping resuspends deposited fine particles into breathing zones for hours.',
    ),
  );

  indoor.push(
    createRecommendation(
      'cooking_ventilation',
      lang,
      'easy',
      'free',
      [
        lang === 'hi'
          ? 'खाना पकाते समय एग्जॉस्ट फैन तुरंत चलाएं।'
          : lang === 'te'
            ? 'వంట చేసేటప్పుడు ఎగ్జాస్ట్ ఫ్యాన్ వెంటనే ఆన్ చేయండి.'
            : 'Turn on kitchen exhaust fan before lighting stove and keep running 5 mins after.',
        lang === 'hi'
          ? 'रसोई का दरवाजा बंद रखें ताकि धुआं अन्य कमरों में न जाए।'
          : lang === 'te'
            ? 'పొగ ఇతర గదుల్లోకి వెళ్లకుండా వంటగది తలుపు మూయండి.'
            : 'Close interior kitchen door to isolate cooking fumes from living and sleeping quarters.',
      ],
      lang === 'hi'
        ? 'उचित वेंटिलेशन से इनडोर PM2.5 और कार्बन मोनोऑक्साइड तुरंत बाहर निकलता है।'
        : lang === 'te'
          ? 'సరైన వెంటిలేషన్ వల్ల ఇండోర్ PM2.5 త్వరగా బయటకు పోతుంది.'
          : 'Kitchen exhaust removes high concentration PM2.5 spikes directly at the source.',
    ),
  );

  if (!profile.hasAirPurifier) {
    indoor.push(
      createRecommendation(
        'build_corsi_box',
        lang,
        'medium',
        'medium',
        [
          lang === 'hi'
            ? 'एक बॉक्स फैन और 4 MERV-13 फिल्टरों को डक्ट टेप से जोड़ें।'
            : lang === 'te'
              ? 'బాక్స్ ఫ్యాన్ మరియు 4 MERV-13 ఫిల్టర్‌లను డక్ట్ టేప్‌తో కలపండి.'
              : 'Tape four MERV-13 furnace filters into a cube with a box fan on top.',
          lang === 'hi'
            ? 'नीचे कार्डबोर्ड का बेस लगाएं और किनारों को पूरी तरह सील करें।'
            : lang === 'te'
              ? 'క్రింద కార్డ్‌బోర్డ్ బేస్ ఉంచి అంచులను బాగా సీల్ చేయండి.'
              : 'Seal the base with cardboard and run on medium speed in central room.',
        ],
        lang === 'hi'
          ? 'कोर्सी-रोसेंथल बॉक्स व्यावसायिक प्यूरीफायर जितनी ही स्वच्छ हवा कम खर्च में देता है।'
          : lang === 'te'
            ? 'కోర్సి-రోసెంథాల్ బాక్స్ తక్కువ ఖర్చుతో వాణిజ్య ప్యూరిఫైయర్ల వలె స్వచ్ఛమైన గాలిని ఇస్తుంది.'
            : 'A DIY Corsi-Rosenthal box provides clean air delivery rates comparable to high-end purifiers.',
      ),
    );
  }

  // 3. Sustainable Alternatives
  const sustainable: Recommendation[] = [];
  if (profile.cookingFuel === 'biomass' || profile.cookingFuel === 'kerosene') {
    sustainable.push(
      createRecommendation(
        'induction_cooking',
        lang,
        'medium',
        'medium',
        [
          lang === 'hi'
            ? 'लकड़ी या मिट्टी के तेल के चूल्हे से इलेक्ट्रिक इंडक्शन कुकटॉप पर आएं।'
            : lang === 'te'
              ? 'బయోమాస్ లేదా కిరోసిన్ నుండి ఇండక్షన్ స్టవ్‌కు మారండి.'
              : 'Transition daily meal boiling and cooking to a single-plate induction cooktop.',
          lang === 'hi'
            ? 'सपाट पेंदे वाले इंडक्शन बर्तनों का उपयोग करें।'
            : lang === 'te'
              ? 'ఇండక్షన్ అనుకూల పాత్రలను వాడండి.'
              : 'Pair with flat-bottom stainless steel cookware for optimal thermal transfer.',
        ],
        lang === 'hi'
          ? 'बायोमास की तुलना में इंडक्शन इनडोर प्रदूषण को 90% तक कम कर देता है।'
          : lang === 'te'
            ? 'బయోమాస్‌తో పోలిస్తే ఇండక్షన్ ఇండోర్ కాలుష్యాన్ని 90% తగ్గిస్తుంది.'
            : 'Electric induction eliminates open combustion smoke, preventing intense indoor soot spikes.',
      ),
    );
  }

  if (profile.commuteMode === 'car' || profile.commuteMode === 'two-wheeler') {
    sustainable.push(
      createRecommendation(
        'switch_to_metro',
        lang,
        'medium',
        'low',
        [
          lang === 'hi'
            ? 'सप्ताह में कम से कम 2-3 दिन निजी वाहन की जगह मेट्रो का उपयोग करें।'
            : lang === 'te'
              ? 'వారానికి కనీసం 2-3 రోజులు మెట్రోలో ప్రయాణించండి.'
              : 'Plan weekly commute using metro rail routes for peak smog days.',
          lang === 'hi'
            ? 'स्मार्ट कार्ड या मोबाइल ऐप से टिकट पहले बुक करें।'
            : lang === 'te'
              ? 'స్మార్ట్ కార్డ్ లేదా యాప్ ద్వారా టికెట్ బుక్ చేసుకోండి.'
              : 'Board air-filtered train cars to minimize traffic-level pollutant exposure.',
        ],
        lang === 'hi'
          ? 'मेट्रो से प्रति यात्री कार्बन उत्सर्जन 80% कम होता है।'
          : lang === 'te'
            ? 'మెట్రో వల్ల వ్యక్తిగత ఉద్గారాలు 80% తగ్గుతాయి.'
            : 'Urban rail transit slashes per-passenger emissions while shielding riders from direct street exhaust.',
      ),
    );
  }

  sustainable.push(
    createRecommendation(
      'avoid_waste_burning',
      lang,
      'easy',
      'free',
      [
        lang === 'hi'
          ? 'सूखे पत्ते, कचरा या प्लास्टिक कभी न जलाएं; कम्पोस्ट बनाएं।'
          : lang === 'te'
            ? 'ఎండిన ఆకులు, ప్లాస్టిక్ లేదా చెత్తను కాల్చవద్దు; కంపోస్ట్ చేయండి.'
            : 'Compost garden leaves and bag municipal waste instead of burning in open air.',
        lang === 'hi'
          ? 'पड़ोस में कचरा जलने पर स्थानीय निकाय या हेल्पलाइन पर रिपोर्ट करें।'
          : lang === 'te'
            ? 'చుట్టుపక్కల చెత్త కాల్చడాన్ని గమనిస్తే అధికారులకు ఫిర్యాదు చేయండి.'
            : 'Notify neighborhood associations or local pollution control hotlines of open burning.',
      ],
      lang === 'hi'
        ? 'कचरा जलने से कार्सिनोजेनिक डायऑक्सिन और बेहद जहरीला धुआं फैलता है।'
        : lang === 'te'
          ? 'చెత్త కాల్చడం వల్ల విషపూరిత పొగ మరియు డయాక్సిన్లు విడుదలవుతాయి.'
          : 'Low-temperature open biomass and plastic smoldering produces high concentrations of toxic carcinogens.',
    ),
  );

  // 4. Protection Guidance
  const protection: Recommendation[] = [];
  protection.push(
    createRecommendation(
      'use_n95_commute',
      lang,
      'easy',
      'low',
      [
        lang === 'hi'
          ? 'सर्टिफाइड N95 या FFP2 मास्क चुनें, साधारण कपड़े का मास्क नहीं।'
          : lang === 'te'
            ? 'సర్టిఫైడ్ N95 లేదా FFP2 మాస్క్ ఎంచుకోండి, సాధారణ గుడ్డ మాస్క్ కాదు.'
            : 'Select certified N95 or FFP2 respirators with strong headbands.',
        lang === 'hi'
          ? 'मास्क को सूखे डिब्बे में रखें और गंदगी दिखने पर बदलें।'
          : lang === 'te'
            ? 'మాస్క్‌ను పొడి బాక్స్‌లో ఉంచండి మరియు మురికిగా ఉన్నప్పుడు మార్చండి.'
            : 'Store in breathable paper bag between uses; discard if soiled or breathing resistance increases.',
      ],
      lang === 'hi'
        ? 'साधारण सर्जिकल मास्क महीन PM2.5 कणों को रोकने में असमर्थ होते हैं।'
        : lang === 'te'
          ? 'సాధారణ మాస్క్‌లు సూక్ష్మ PM2.5 కణాలను ఆపలేవు.'
          : 'Cloth masks allow over 80% particle penetration, whereas electrostatically charged N95 media traps submicron soot.',
    ),
  );

  if (profile.hasChildren || profile.hasElderly || profile.hasSensitiveMembers) {
    protection.push(
      createRecommendation(
        'limit_outdoor_children',
        lang,
        'easy',
        'free',
        [
          lang === 'hi'
            ? 'सुबह और देर शाम बच्चों और बुजुर्गों की बाहरी गतिविधियां बंद रखें।'
            : lang === 'te'
              ? 'ఉదయం మరియు సాయంత్రం పిల్లలు, వృద్ధుల బహిరంగ కార్యకలాపాలను పరిమితం చేయండి.'
              : 'Restrict outdoor recess, jogging, and walking during morning and twilight smog peaks.',
          lang === 'hi'
            ? 'लक्षण दिखने पर (खांसी, सांस फूलना) तुरंत डॉक्टर से संपर्क करें।'
            : lang === 'te'
              ? 'శ్వాసకోశ ఇబ్బందులు ఉంటే వైద్యుడిని సంప్రదించండి.'
              : 'Have prescribed rescue inhalers accessible for family members with asthma or COPD.',
        ],
        lang === 'hi'
          ? 'कमजोर फेफड़ों पर प्रदूषण का असर तुरंत और गहरा होता है।'
          : lang === 'te'
            ? 'బలహీనమైన ఊపిరితిత్తులపై కాలుష్య ప్రభావం వేగంగా ఉంటుంది.'
            : 'Vulnerable airways trigger inflammatory bronchospasms rapidly under high particulate stress.',
      ),
    );
  }

  // Summary
  const categoryLabel = airSummary.current.category.label;
  const summary =
    lang === 'hi'
      ? `आज वायु गुणवत्ता "${categoryLabel}" (AQI ${aqi}) है। अपने परिवार को स्मॉग से बचाने और उत्सर्जन कम करने के लिए यह अनुकूलित कार्ययोजना अपनाएं।`
      : lang === 'te'
        ? `నేటి వాయు నాణ్యత "${categoryLabel}" (AQI ${aqi}) గా ఉంది. మీ కుటుంబాన్ని కాలుష్యం నుండి రక్షించడానికి మరియు ఉద్గారాలను తగ్గించడానికి ఈ ప్రణాళికను అనుసరించండి.`
        : `Air is "${categoryLabel}" (AQI ${aqi}) today. Follow this tailored action plan to protect your household from winter smog and lower your community emissions.`;

  return {
    summary,
    routine: {
      morning,
      afternoon,
      evening,
    },
    indoor,
    sustainable,
    protection,
    bestVentilationWindow: airSummary.bestVentilationWindow.label,
    avoidOutdoorWindow: airSummary.worstOutdoorWindow.label,
  };
}
