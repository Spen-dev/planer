/* Matrix-weekly link helpers — pure functions for tests. */
const PlanerMatrixLinks = (() => {
  function relocateMatrixLinksForWeeklyMove(matrixLinks, weekStart, fromDay, fromTask, toDay, toTask) {
    const next = {};
    for (const [quadrantId, links] of Object.entries(matrixLinks || {})) {
      next[quadrantId] = (links || []).map((link) => {
        if (!link || link.weekStart !== weekStart) return link;
        if (link.dayIdx === fromDay && link.taskIdx === fromTask) {
          return { weekStart, dayIdx: toDay, taskIdx: toTask };
        }
        if (link.dayIdx === toDay && link.taskIdx === toTask) {
          return { weekStart, dayIdx: fromDay, taskIdx: fromTask };
        }
        return link;
      });
    }
    return next;
  }

  function clearWeeklyTaskForLink(weeks, link) {
    if (!link) return weeks;
    const week = weeks?.[link.weekStart];
    if (!week?.days?.[link.dayIdx]?.tasks?.[link.taskIdx]) return weeks;
    const nextWeeks = { ...weeks, [link.weekStart]: { ...week, days: week.days.map((day) => ({ ...day, tasks: day.tasks.map((t) => ({ ...t })) })) } };
    nextWeeks[link.weekStart].days[link.dayIdx].tasks[link.taskIdx] = { text: "", done: false };
    return nextWeeks;
  }

  return { relocateMatrixLinksForWeeklyMove, clearWeeklyTaskForLink };
})();
