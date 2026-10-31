import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  translateWithSarvamAPI, 
  translateBatchWithSarvamAPI, 
  fetchSarvamStatusAPI,
  configureSarvamKeyAPI
} from './api';
import i18n from '../i18n';

const SarvamContext = createContext(null);

export const SarvamProvider = ({ children }) => {
  const [sarvamConfigured, setSarvamConfigured] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationStatusMsg, setTranslationStatusMsg] = useState(null);

  // Check Sarvam AI status on boot
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetchSarvamStatusAPI();
        setSarvamConfigured(Boolean(res?.configured));
      } catch (e) {
        setSarvamConfigured(false);
      }
    };
    checkStatus();
  }, []);

  /**
   * Save Sarvam API Key
   */
  const saveApiKey = async (key) => {
    try {
      const res = await configureSarvamKeyAPI(key);
      setSarvamConfigured(Boolean(res?.configured));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  /**
   * Translate single string with local cache
   */
  const translateText = async (text, targetLang = i18n.language) => {
    if (!text || targetLang === 'en') return text;
    const cacheKey = `sarvam_${targetLang}_${text.trim()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    try {
      const res = await translateWithSarvamAPI({ text, target_language: targetLang });
      if (res?.translated_text) {
        localStorage.setItem(cacheKey, res.translated_text);
        return res.translated_text;
      }
    } catch (e) {}
    return text;
  };

  /**
   * Translate array of strings with local cache
   */
  const translateBatch = async (texts = [], targetLang = i18n.language) => {
    if (!texts.length || targetLang === 'en') return texts;

    const uncachedIndices = [];
    const uncachedTexts = [];
    const results = [...texts];

    texts.forEach((txt, idx) => {
      const cacheKey = `sarvam_${targetLang}_${txt?.trim()}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        results[idx] = cached;
      } else {
        uncachedIndices.push(idx);
        uncachedTexts.push(txt);
      }
    });

    if (uncachedTexts.length === 0) {
      return results;
    }

    try {
      setIsTranslating(true);
      const res = await translateBatchWithSarvamAPI({ texts: uncachedTexts, target_language: targetLang });
      if (Array.isArray(res?.translated_texts)) {
        res.translated_texts.forEach((trans, i) => {
          const originalIdx = uncachedIndices[i];
          const originalText = uncachedTexts[i];
          results[originalIdx] = trans;
          localStorage.setItem(`sarvam_${targetLang}_${originalText.trim()}`, trans);
        });
      }
    } catch (e) {
      console.warn('[Sarvam Translate Batch] error:', e);
    } finally {
      setIsTranslating(false);
    }

    return results;
  };

  /**
   * Translate entire active lesson plan and timetable blocks into teacher's chosen regional language
   */
  const translateEntireClassroomPlan = async (plan, blocks, targetLang = i18n.language) => {
    if (!targetLang || targetLang === 'en') return { plan, blocks };

    setIsTranslating(true);
    setTranslationStatusMsg(`Translating whole lesson plan and schedule to ${targetLang} with Sarvam AI...`);

    try {
      // 1. Gather all unique text elements from plan and blocks
      const textsToTranslate = [];

      if (plan) {
        if (plan.topic) textsToTranslate.push(plan.topic);
        if (plan.common_theme) textsToTranslate.push(plan.common_theme);
        if (plan.summary) textsToTranslate.push(plan.summary);
        if (Array.isArray(plan.grade_plans)) {
          plan.grade_plans.forEach(gp => {
            if (gp.learning_objective) textsToTranslate.push(gp.learning_objective);
            if (gp.direct_instruction) textsToTranslate.push(gp.direct_instruction);
            if (gp.independent_activity) textsToTranslate.push(gp.independent_activity);
            if (gp.peer_learning_activity) textsToTranslate.push(gp.peer_learning_activity);
          });
        }
      }

      if (Array.isArray(blocks)) {
        blocks.forEach(b => {
          if (b.title) textsToTranslate.push(b.title);
          if (Array.isArray(b.assignments)) {
            b.assignments.forEach(a => {
              if (a.activity) textsToTranslate.push(a.activity);
            });
          }
        });
      }

      // Unique texts
      const uniqueTexts = Array.from(new Set(textsToTranslate.filter(Boolean)));
      const translatedMap = {};

      const translatedArray = await translateBatch(uniqueTexts, targetLang);
      uniqueTexts.forEach((orig, idx) => {
        translatedMap[orig] = translatedArray[idx] || orig;
      });

      // 2. Rebuild translated plan
      let translatedPlan = plan;
      if (plan) {
        translatedPlan = {
          ...plan,
          topic: translatedMap[plan.topic] || plan.topic,
          common_theme: translatedMap[plan.common_theme] || plan.common_theme,
          summary: translatedMap[plan.summary] || plan.summary,
          grade_plans: Array.isArray(plan.grade_plans)
            ? plan.grade_plans.map(gp => ({
                ...gp,
                learning_objective: translatedMap[gp.learning_objective] || gp.learning_objective,
                direct_instruction: translatedMap[gp.direct_instruction] || gp.direct_instruction,
                independent_activity: translatedMap[gp.independent_activity] || gp.independent_activity,
                peer_learning_activity: translatedMap[gp.peer_learning_activity] || gp.peer_learning_activity
              }))
            : plan.grade_plans
        };
      }

      // 3. Rebuild translated blocks
      let translatedBlocks = blocks;
      if (Array.isArray(blocks)) {
        translatedBlocks = blocks.map(b => ({
          ...b,
          title: translatedMap[b.title] || b.title,
          assignments: Array.isArray(b.assignments)
            ? b.assignments.map(a => ({
                ...a,
                activity: translatedMap[a.activity] || a.activity
              }))
            : b.assignments
        }));
      }

      setTranslationStatusMsg(`✓ Complete lesson & schedule translated to ${targetLang}!`);
      setTimeout(() => setTranslationStatusMsg(null), 3500);

      return { plan: translatedPlan, blocks: translatedBlocks };
    } catch (err) {
      console.warn('[Sarvam Translate Plan] error:', err);
      setTranslationStatusMsg(null);
      return { plan, blocks };
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <SarvamContext.Provider value={{
      sarvamConfigured,
      isTranslating,
      translationStatusMsg,
      saveApiKey,
      translateText,
      translateBatch,
      translateEntireClassroomPlan
    }}>
      {children}
    </SarvamContext.Provider>
  );
};

export const useSarvam = () => {
  const context = useContext(SarvamContext);
  if (!context) {
    return {
      sarvamConfigured: false,
      isTranslating: false,
      translationStatusMsg: null,
      saveApiKey: async () => ({ success: false }),
      translateText: async (t) => t,
      translateBatch: async (t) => t,
      translateEntireClassroomPlan: async (p, b) => ({ plan: p, blocks: b })
    };
  }
  return context;
};

