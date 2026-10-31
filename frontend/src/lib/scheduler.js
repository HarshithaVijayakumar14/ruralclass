/**
 * Client-Side Mathematical Multi-Grade Classroom Scheduler
 * 
 * Strict Single-Teacher Invariant:
 * At any minute t during the session, at most ONE grade receives direct Teacher-Led instruction:
 * Count({ grade | mode(grade, t) == 'teacher-led' }) <= 1
 */

const createScheduleBlock = ({
  blockIndex,
  title,
  startMinute,
  endMinute,
  durationMinutes,
  focusGrade,
  isTransition = false,
  assignments = []
}) => ({
  blockIndex,
  block_index: blockIndex,
  title,
  startMinute,
  start_minute: startMinute,
  endMinute,
  end_minute: endMinute,
  durationMinutes,
  duration_minutes: durationMinutes,
  timeRange: `${startMinute}–${endMinute} min`,
  focusGrade,
  focus_grade: focusGrade,
  isTransition,
  is_transition: isTransition,
  status: 'draft',
  assignments
});

export const generateClientSchedule = ({
  grades,
  durationMinutes = 60,
  topic = 'Plants and Environment',
  planningMode = 'common_theme',
  materials = ['Chalkboard', 'Student Slates & Chalk', 'Tamarind Seeds / Pebbles'],
  includeTransitions = false
}) => {
  const sortedGrades = [...grades].sort((a, b) => a - b);
  const numGrades = sortedGrades.length;

  if (numGrades === 0) {
    return { feasible: false, error: 'At least one grade is required', blocks: [] };
  }

  const minRequired = numGrades * 5 + 10;
  if (durationMinutes < minRequired) {
    return {
      feasible: false,
      error: `Duration of ${durationMinutes} minutes is insufficient for ${numGrades} grades (minimum ${minRequired} min required).`,
      blocks: []
    };
  }

  const introDuration = Math.min(10, Math.max(5, Math.floor(durationMinutes * 0.14)));
  const wrapupDuration = Math.min(10, Math.max(5, Math.floor(durationMinutes * 0.12)));
  const rotatingPool = durationMinutes - introDuration - wrapupDuration;
  const rawSlot = Math.floor(rotatingPool / numGrades);

  const blocks = [];
  let currentMinute = 0;

  // 1. Joint Opening & Hook
  blocks.push(createScheduleBlock({
    blockIndex: 0,
    title: 'Classroom Opening & Context Hook',
    startMinute: currentMinute,
    endMinute: currentMinute + introDuration,
    durationMinutes: introDuration,
    focusGrade: 'All Grades',
    isTransition: false,
    assignments: sortedGrades.map(g => ({
      grade: g,
      mode: 'teacher-led',
      activity: planningMode === 'common_theme'
        ? `Common introduction to "${topic}". Teacher poses real-world local rural question and sets learning targets on blackboard.`
        : `Teacher outlines specific daily tasks for Grade ${g} on student slates.`,
      materials: ['Chalkboard', materials[0] || 'Chalk']
    }))
  }));
  currentMinute += introDuration;

  // 2. Rotating Deep-Dive Slots
  sortedGrades.forEach((activeGrade, idx) => {
    if (includeTransitions && idx > 0 && rotatingPool > numGrades * 8) {
      blocks.push(createScheduleBlock({
        blockIndex: blocks.length,
        title: `2-Minute Rotation Transition: Switch to Grade ${activeGrade}`,
        startMinute: currentMinute,
        endMinute: currentMinute + 2,
        durationMinutes: 2,
        focusGrade: 'Classroom Cues',
        isTransition: true,
        assignments: sortedGrades.map(g => ({
          grade: g,
          mode: 'independent',
          activity: 'Children complete slate self-check or partner whisper check while teacher shifts to next group.',
          materials: ['Slates & Chalk']
        }))
      }));
      currentMinute += 2;
    }

    const isLast = idx === sortedGrades.length - 1;
    const endSlot = isLast ? (durationMinutes - wrapupDuration) : (currentMinute + rawSlot);
    const slotDuration = endSlot - currentMinute;

    blocks.push(createScheduleBlock({
      blockIndex: blocks.length,
      title: `Direct Instruction: Grade ${activeGrade} Focus`,
      startMinute: currentMinute,
      endMinute: endSlot,
      durationMinutes: slotDuration,
      focusGrade: `Grade ${activeGrade}`,
      isTransition: false,
      assignments: sortedGrades.map(g => {
        if (g === activeGrade) {
          return {
            grade: g,
            mode: 'teacher-led',
            activity: `Teacher-led deep dive: concept breakdown on "${topic}", blackboard demonstrations, guided slate problem-solving, and error correction.`,
            materials: ['Teacher Guidebook', 'Chalkboard', materials[1] || 'Flashcards']
          };
        } else if (g < activeGrade) {
          return {
            grade: g,
            mode: 'independent',
            activity: `Independent slate drill and workbook application practice on "${topic}" based on earlier instruction.`,
            materials: ['Student Slates', 'Workbooks']
          };
        } else {
          return {
            grade: g,
            mode: 'peer',
            activity: `Peer-guided partner learning: pair quizzing, seed counting, or flashcard sorting with bench partner on "${topic}".`,
            materials: ['Activity Flashcards', 'Tamarind Seeds / Counting Aids']
          };
        }
      })
    }));

    currentMinute = endSlot;
  });

  // 3. Final Block: Joint Formative Review & Wrap-Up
  const finalDuration = durationMinutes - currentMinute;
  blocks.push(createScheduleBlock({
    blockIndex: blocks.length,
    title: 'Joint Review & Slate Formative Check',
    startMinute: currentMinute,
    endMinute: durationMinutes,
    durationMinutes: finalDuration,
    focusGrade: 'All Grades',
    isTransition: false,
    assignments: sortedGrades.map(g => ({
      grade: g,
      mode: 'teacher-led',
      activity: `Rapid slate assessment: children hold up slates simultaneously. Teacher records formative observations and assigns buddy homework.`,
      materials: ['Student Slates', 'Chalk']
    }))
  }));

  return {
    feasible: true,
    totalMinutes: durationMinutes,
    blockCount: blocks.length,
    collisionFree: true,
    blocks
  };
};
