function collectWeeklyDayStats() {
  const week = getWeek(state.weekStart);
  return week.days.map((day, i) => ({
    dayIdx: i,
    name: DEFAULT_DAY_THEMES[i].name,
    ...calcDayStats(day),
  }));
}

function calcWeekTotals(days) {
  return days.reduce(
    (acc, d) => ({
      total: acc.total + d.total,
      completed: acc.completed + d.completed,
      notDone: acc.notDone + d.notDone,
    }),
    { total: 0, completed: 0, notDone: 0 },
  );
}

function renderStatsProgressChart(container) {
  const days = collectWeeklyDayStats();
  const themes = getDayThemes();

  const chart = document.createElement("div");
  chart.className = "stats-chart stats-chart-progress";
  chart.innerHTML = `<h3 class="stats-chart-title">Прогресс по дням</h3>`;

  const bars = document.createElement("div");
  bars.className = "stats-bars stats-progress-bars";

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const theme = themes[i];
    const pct = Math.round(day.progress * 100);
    const col = document.createElement("div");
    col.className = "stats-bar-col";
    col.innerHTML = `
      <div class="stats-progress-bar-wrap">
        <div class="stats-progress-bar" style="height:${pct}%;background:${theme.accent}"></div>
      </div>
      <span class="stats-progress-value" style="color:${theme.accent}">${pct}%</span>
      <span class="stats-bar-label">${day.name}</span>
    `;
    bars.appendChild(col);
  }

  chart.appendChild(bars);
  container.appendChild(chart);
}

function renderStatsGroupedDonePendingChart(container) {
  const days = collectWeeklyDayStats();
  const maxVal = Math.max(1, ...days.flatMap((d) => [d.completed, d.notDone]));

  const chart = document.createElement("div");
  chart.className = "stats-chart";
  chart.innerHTML = `
    <h3 class="stats-chart-title">Задачи по дням</h3>
    <div class="stats-legend">
      <span class="stats-legend-item stats-legend-done">Выполнено</span>
      <span class="stats-legend-item stats-legend-pending">Не выполнено</span>
    </div>
  `;

  const bars = document.createElement("div");
  bars.className = "stats-bars stats-bars-grouped";

  for (const day of days) {
    const donePct = (day.completed / maxVal) * 100;
    const pendingPct = (day.notDone / maxVal) * 100;
    const col = document.createElement("div");
    col.className = "stats-bar-col";
    col.innerHTML = `
      <div class="stats-bar-pair">
        <div class="stats-bar-wrap">
          <div class="stats-bar stats-bar-done" style="height:${donePct}%"></div>
        </div>
        <div class="stats-bar-wrap">
          <div class="stats-bar stats-bar-pending" style="height:${pendingPct}%"></div>
        </div>
      </div>
      <div class="stats-bar-values">
        <span>${day.completed}</span>
        <span>${day.notDone}</span>
      </div>
      <span class="stats-bar-label">${day.name}</span>
    `;
    bars.appendChild(col);
  }

  chart.appendChild(bars);
  container.appendChild(chart);
}

function renderWeeklyStats(updateWindow = true) {
  const summaryEl = document.getElementById("statsSummary");
  const chartsEl = document.getElementById("statsCharts");
  const rangeEl = document.getElementById("statsWeekRange");
  if (!summaryEl || !chartsEl) return;

  const start = state.weekStart;
  if (rangeEl) {
    rangeEl.textContent = `${formatDateLong(start)} — ${formatDateLong(addDays(start, 6))}`;
  }

  const days = collectWeeklyDayStats();
  const totals = calcWeekTotals(days);
  const weekProgress = totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;

  summaryEl.innerHTML = `
    <div class="stats-summary-card stats-summary-done">
      <span class="stats-summary-label">Выполнено за неделю</span>
      <strong class="stats-summary-value">${totals.completed}</strong>
    </div>
    <div class="stats-summary-card stats-summary-pending">
      <span class="stats-summary-label">Не выполнено</span>
      <strong class="stats-summary-value">${totals.notDone}</strong>
    </div>
    <div class="stats-summary-card stats-summary-total">
      <span class="stats-summary-label">Всего задач</span>
      <strong class="stats-summary-value">${totals.total}</strong>
    </div>
    <div class="stats-summary-card stats-summary-progress">
      <span class="stats-summary-label">Прогресс недели</span>
      <strong class="stats-summary-value">${weekProgress}%</strong>
    </div>
  `;

  chartsEl.innerHTML = "";
  renderStatsGroupedDonePendingChart(chartsEl);
  renderStatsProgressChart(chartsEl);

  if (updateWindow) fitStatsWindow();
}

function maybeRefreshStatsTab() {
  if (document.body.classList.contains("view-stats")) renderWeeklyStats(false);
}

function shiftStatsWeek(deltaDays) {
  state.weekStart = addDays(state.weekStart, deltaDays);
  updateWeekLabel();
  renderWeekly(true);
  renderWeeklyStats();
  scheduleSave();
}

function setupStatsEvents() {
  if (window.__statsEventsReady) return;
  window.__statsEventsReady = true;

  document.getElementById("statsPrevWeek")?.addEventListener("click", () => shiftStatsWeek(-7));
  document.getElementById("statsNextWeek")?.addEventListener("click", () => shiftStatsWeek(7));
  document.getElementById("statsTodayWeek")?.addEventListener("click", () => {
    state.weekStart = toDateString(mondayOf(new Date()));
    updateWeekLabel();
    renderWeekly(true);
    renderWeeklyStats();
    scheduleSave();
  });
}
