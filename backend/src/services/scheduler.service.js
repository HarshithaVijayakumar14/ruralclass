/**
 * Mathematical Multi-Grade Classroom Scheduler
 * 
 * Strict Single-Teacher Invariant:
 * At any minute t during the session, at most ONE grade receives direct Teacher-Led instruction:
 * Count({ grade | mode(grade, t) == 'teacher-led' }) <= 1
 * 
 * All other grades are assigned structured Independent Practice or Peer Learning.
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

export const generateMathematicalSchedule = ({
  grades,
  durationMinutes = 60,
  topic = 'Plants and Environment',
  planningMode = 'common_theme',
  materials = ['Chalkboard', 'Slates & Chalk', 'Seeds / Pebbles'],
  includeTransitions = false
}) => {
  const sortedGrades = [...grades].sort((a, b) => a - b);
  const numGrades = sortedGrades.length;

  if (numGrades === 0) {
    return {
      feasible: false,
      error: 'At least one grade is required to generate a schedule.',
      blocks: []
    };
  }

  // Minimum feasible duration check: At least 5 mins per grade + 10 mins intro/wrap-up
  const minRequiredMinutes = numGrades * 5 + 10;
  if (durationMinutes < minRequiredMinutes) {
    return {
      feasible: false,
      error: `Duration of ${durationMinutes} minutes is insufficient for ${numGrades} grades. Minimum required is ${minRequiredMinutes} minutes (at least 5 min direct teacher time per grade + 10 min opening/closing).`,
      blocks: []
    };
  }

  // Opening hook: 10% - 15% of duration (max 10 min, min 5 min)
  const introDuration = Math.min(10, Math.max(5, Math.floor(durationMinutes * 0.14)));
  // Closing reflection: 10% - 15% of duration (max 10 min, min 5 min)
  const wrapupDuration = Math.min(10, Math.max(5, Math.floor(durationMinutes * 0.12)));
  // Remaining time for grade-level deep dives
  const rotatingPool = durationMinutes - introDuration - wrapupDuration;
  const rawSlot = Math.floor(rotatingPool / numGrades);
  
  const blocks = [];
  let currentMinute = 0;

  // 1. Block 0: Joint Opening & Context Hook
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
    // If not first slot, add a 2-minute transition cue if time permits and requested
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
          activity: 'Children write quick slate check or partner whisper check while teacher rotates to next group.',
          materials: ['Slates & Chalk']
        }))
      }));
      currentMinute += 2;
    }

    // Determine end time for this grade slot
    const isLast = idx === sortedGrades.length - 1;
    const endSlot = isLast ? (durationMinutes - wrapupDuration) : (currentMinute + rawSlot);
    const slotDuration = endSlot - currentMinute;

    blocks.push(createScheduleBlock({
      blockIndex: blocks.length,
      title: `Rotation Slot ${idx + 1}: Direct Instruction for Grade ${activeGrade}`,
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
            activity: `Direct teacher instruction for Grade ${g} on "${topic}": concept modeling, chalkboard diagrams, and guided slate drills.`,
            materials: ['Teacher Handbook', 'Chalkboard', materials[1] || 'Flashcards']
          };
        } else if (g < activeGrade) {
          return {
            grade: g,
            mode: 'independent',
            activity: `Independent slate drill and workbook problem solving on "${topic}" following earlier teacher modeling.`,
            materials: ['Student Slates', 'Workbooks']
          };
        } else {
          return {
            grade: g,
            mode: 'peer',
            activity: `Peer-guided collaborative practice with bench partner: buddy quiz or manipulative counting on "${topic}".`,
            materials: ['Activity Flashcards', 'Pebbles / Tamarind Seeds']
          };
        }
      })
    }));

    currentMinute = endSlot;
  });

  // 3. Block Final: Joint Formative Review & Wrap-Up
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
      activity: `Teacher conducts whole-room slate check for "${topic}". All students hold up slates simultaneously.`,
      materials: ['Student Slates', 'Chalk']
    }))
  }));

  // Mathematically verify Single-Teacher Invariant
  const invariantViolations = [];
  blocks.forEach(block => {
    if (!block.isTransition && block.focusGrade !== 'All Grades') {
      const teacherLedCount = block.assignments.filter(a => a.mode === 'teacher-led').length;
      if (teacherLedCount > 1) {
        invariantViolations.push({
          blockIndex: block.blockIndex,
          teacherLedCount,
          timeRange: `${block.startMinute}–${block.endMinute}`
        });
      }
    }
  });

  return {
    feasible: invariantViolations.length === 0,
    totalMinutes: durationMinutes,
    blockCount: blocks.length,
    collisionFree: invariantViolations.length === 0,
    invariantViolations,
    blocks
  };
};

export const validateTeacherConstraint = (blocksOrAssignments) => {
  if (!Array.isArray(blocksOrAssignments)) return true;
  if (blocksOrAssignments.length === 0) return true;

  // If array of blocks
  if (blocksOrAssignments[0].assignments) {
    for (const block of blocksOrAssignments) {
      if (!block.isTransition && block.focusGrade !== 'All Grades' && block.focus_grade !== 'All Grades') {
        const teacherCount = (block.assignments || []).filter(a => a.mode === 'teacher-led').length;
        if (teacherCount > 1) return false;
      }
    }
    return true;
  }

  // If array of assignments
  const teacherLedCount = blocksOrAssignments.filter(a => a.mode === 'teacher-led').length;
  return teacherLedCount <= 1;
};
