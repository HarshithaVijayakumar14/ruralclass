import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Languages, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  School,
  MapPin,
  Globe2,
  Sparkles,
  Key,
  Check
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { SUPPORTED_LANGUAGES } from '../i18n/languages';
import { changeAppLanguage } from '../i18n';
import { useTranslation } from 'react-i18next';
import { getPendingSyncQueue } from '../lib/db';
import { syncOfflineQueue, fetchSarvamStatusAPI, configureSarvamKeyAPI, translateWithSarvamAPI } from '../lib/api';
import { useSarvam } from '../lib/sarvamTranslation';

export const Settings = ({ activeClassroom }) => {
  const { t, i18n } = useTranslation();
  const { user, userProfile, updateProfile } = useAuth();
  const { saveApiKey, sarvamConfigured, isTranslating } = useSarvam();

  const [fullName, setFullName] = useState(userProfile?.full_name || '');
  const [schoolName, setSchoolName] = useState(userProfile?.school_name || '');
  const [district, setDistrict] = useState(userProfile?.district || '');
  const [state, setState] = useState(userProfile?.state || '');
  const [selectedLang, setSelectedLang] = useState(userProfile?.preferred_language || i18n.language || 'en');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // Sarvam API Key State
  const [sarvamKeyInput, setSarvamKeyInput] = useState('');
  const [sarvamSaving, setSarvamSaving] = useState(false);
  const [sarvamMsg, setSarvamMsg] = useState(null);
  const [testInput, setTestInput] = useState('Multi-grade classroom rotation');
  const [testOutput, setTestOutput] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.full_name || '');
      setSchoolName(userProfile.school_name || '');
      setDistrict(userProfile.district || '');
      setState(userProfile.state || '');
      setSelectedLang(userProfile.preferred_language || i18n.language || 'en');
    }

    const checkQueue = async () => {
      const q = await getPendingSyncQueue();
      setPendingQueue(q);
    };
    checkQueue();
  }, [userProfile, i18n.language]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      await updateProfile({
        full_name: fullName.trim(),
        school_name: schoolName.trim(),
        district: district.trim(),
        state: state.trim(),
        preferred_language: selectedLang
      });
      await changeAppLanguage(selectedLang);
      setSuccess(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSarvamKey = async (e) => {
    e.preventDefault();
    setSarvamSaving(true);
    setSarvamMsg(null);
    try {
      const res = await saveApiKey(sarvamKeyInput);
      if (res.success) {
        setSarvamMsg('✓ Sarvam AI Subscription Key saved and activated successfully!');
        setSarvamKeyInput('');
      } else {
        setSarvamMsg(`✕ Error: ${res.error}`);
      }
    } catch (e) {
      setSarvamMsg(`✕ Error saving key: ${e.message}`);
    } finally {
      setSarvamSaving(false);
    }
  };

  const handleTestTranslation = async () => {
    if (!testInput.trim()) return;
    setTesting(true);
    try {
      const res = await translateWithSarvamAPI({
        text: testInput,
        target_language: selectedLang,
        source_language: 'en'
      });
      setTestOutput(res?.translated_text || 'Translation returned empty');
    } catch (e) {
      setTestOutput(`Error: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await syncOfflineQueue();
      const q = await getPendingSyncQueue();
      setPendingQueue(q);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-[#2E7D32]" />
          <span>{t('settings.title', 'Settings & Regional Language')}</span>
        </h1>
        <p className="text-xs text-stone-500">
          {t('settings.subtitle', 'Manage your teacher profile, classroom defaults, and Sarvam AI regional language translation')}
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
          <span>{t('settings.profileUpdated', 'Profile and language preferences updated successfully.')}</span>
        </div>
      )}

      {/* Sarvam AI Regional Language Configuration Card */}
      <div className="bg-gradient-to-br from-emerald-50/60 to-white rounded-2xl border border-emerald-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2E7D32] text-white flex items-center justify-center">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <span>{t('settings.sarvamTitle', 'Sarvam AI Regional Language Engine')}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                  22 Indian Languages
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                {t('settings.sarvamDesc', 'Powers instant translation of lesson plans, schedule slots, worksheets, and dashboard.')}
              </p>
            </div>
          </div>

          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
            sarvamConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {sarvamConfigured ? '✓ Sarvam API Connected' : '• Built-in Regional Corpus Active'}
          </span>
        </div>

        {/* Sarvam Key Form */}
        <form onSubmit={handleSaveSarvamKey} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t('settings.sarvamApiKey', 'Sarvam API Subscription Key')}</span>
              <span className="text-[10px] text-stone-400 font-normal">(from api.sarvam.ai)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={sarvamKeyInput}
                onChange={(e) => setSarvamKeyInput(e.target.value)}
                placeholder="Paste your api-subscription-key here..."
                className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32] bg-white font-mono"
              />
              <button
                type="submit"
                disabled={sarvamSaving || !sarvamKeyInput.trim()}
                className="px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{sarvamSaving ? 'Saving...' : 'Save Key'}</span>
              </button>
            </div>
          </div>

          {sarvamMsg && (
            <div className={`p-2.5 rounded-xl text-xs font-semibold ${
              sarvamMsg.startsWith('✓') ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
            }`}>
              {sarvamMsg}
            </div>
          )}
        </form>

        {/* Translation Test Tool */}
        <div className="pt-3 border-t border-emerald-100/70 space-y-2">
          <label className="text-xs font-bold text-stone-700 block">
            Test Instant Regional Translation ({selectedLang}):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32] bg-white"
            />
            <button
              type="button"
              onClick={handleTestTranslation}
              disabled={testing}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Translating...' : 'Test'}</span>
            </button>
          </div>
          {testOutput && (
            <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-emerald-900 shadow-2xs">
              <span className="text-stone-400 font-normal mr-2">Result:</span> {testOutput}
            </div>
          )}
        </div>
      </div>

      {/* Teacher Profile & Regional Language Form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
          <User className="w-4 h-4 text-[#2E7D32]" />
          <h2 className="text-sm font-bold text-stone-900">{t('settings.profileSection', 'Teacher Profile & Language')}</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-stone-700 block">{t('auth.fullName', 'Registered Full Name')}</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700 block">{t('classrooms.schoolName', 'School Name')}</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. Govt Higher Primary School"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700 block">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Ramanagara"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700 block">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Karnataka"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
              />
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-2 pt-3 border-t border-stone-100">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#2E7D32]" />
              <label className="font-bold text-stone-900 block text-xs">
                {t('settings.selectLanguage', 'Preferred Interface Language')} (22 Scheduled Indian Languages + English)
              </label>
            </div>

            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="w-full sm:max-w-md px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-800 outline-none focus:border-[#2E7D32]"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} — {lang.name} {lang.dir === 'rtl' ? '(RTL)' : ''}
                </option>
              ))}
            </select>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              {t('common.machineTranslatedNotice', 'Powered by Sarvam AI Indian regional translation engine.')}
            </p>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? t('common.loading', 'Saving Changes...') : t('common.save', 'Save Settings')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Offline Storage & Sync Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-stone-900">Offline Storage & Mutation Queue</h2>
            <p className="text-xs text-stone-500">
              GuruMitra stores plans and rosters in your browser's IndexedDB when connectivity drops.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing || pendingQueue.length === 0}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-900 font-semibold text-xs shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync Now ({pendingQueue.length})</span>
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
          Pending Offline Changes: <strong className="text-stone-900">{pendingQueue.length} items</strong>
        </div>
      </div>

    </div>
  );
};
