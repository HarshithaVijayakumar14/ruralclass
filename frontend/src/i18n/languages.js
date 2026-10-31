export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', verified: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', verified: true },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr', verified: true },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr', verified: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr', verified: false },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr', verified: false },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr', verified: false },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr', verified: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr', verified: false },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', dir: 'ltr', verified: false },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr', verified: false },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', dir: 'ltr', verified: false },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl', verified: false },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', dir: 'ltr', verified: false },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', dir: 'ltr', verified: false },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', dir: 'ltr', verified: false },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', dir: 'ltr', verified: false },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', dir: 'ltr', verified: false },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر', dir: 'rtl', verified: false },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', dir: 'rtl', verified: false },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', dir: 'ltr', verified: false },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', dir: 'ltr', verified: false },
  { code: 'mni', name: 'Manipuri (Meitei)', nativeName: 'মৈতৈলোন্', dir: 'ltr', verified: false }
];

export const getLanguageByCode = (code) => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code) || SUPPORTED_LANGUAGES[0];
};

