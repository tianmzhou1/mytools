const STORAGE_KEY = "clock_records_v1";

const recordList = document.getElementById("recordList");
const clockBtn = document.getElementById("clockBtn");

const weekMap = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

let records = loadRecords();

renderRecords();

clockBtn.addEventListener("click", () => {
  const now = new Date();
  const workdayKey = getWorkdayKey(now);

  let record = records.find(item => item.dateKey === workdayKey);

  if (!record) {
    record = {
      dateKey: workdayKey,
      startTime: now.getTime(),
      endTime: null
    };

    records.push(record);
  } else {
    record.endTime = now.getTime();
  }

  saveRecords();
  renderRecords();
});

recordList.addEventListener("input", handleTimeInput);
recordList.addEventListener("change", handleTimeInput);

function handleTimeInput(event) {
  const input = event.target;

  if (!input.matches(".time-input")) return;

  const record = records.find(item => item.dateKey === input.dataset.dateKey);
  if (!record) return;

  if (input.dataset.field === "startTime") {
    if (!input.value) {
      if (event.type === "change") {
        renderRecords();
      }

      return;
    }

    record.startTime = parseWorkdayTime(record.dateKey, input.value);
  }

  if (input.dataset.field === "endTime") {
    record.endTime = input.value ? parseWorkdayTime(record.dateKey, input.value) : null;
  }

  saveRecords();
  updateWorkHours(input, record);
}

/**
 * 核心逻辑：
 * 一天从凌晨 4 点开始。
 * 所以把当前时间减去 4 小时，再取日期。
 *
 * 例如：
 * 2026-05-19 03:30
 * 减去 4 小时后是 2026-05-18 23:30
 * 因此归属于 2026-05-18 这个打卡日。
 */
function getWorkdayKey(date) {
  const shifted = new Date(date.getTime() - 4 * 60 * 60 * 1000);

  const year = shifted.getFullYear();
  const month = String(shifted.getMonth() + 1).padStart(2, "0");
  const day = String(shifted.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const week = weekMap[date.getDay()];

  return `${year}年${String(month).padStart(2, "0")}月${String(day).padStart(2, "0")}日 ${week}`;
}

function formatTime(timestamp) {
  if (!timestamp) return "--:--";

  const date = new Date(timestamp);

  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
}

function formatTimeInput(timestamp) {
  if (!timestamp) return "";

  return formatTime(timestamp);
}

function parseWorkdayTime(dateKey, timeValue) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  const date = new Date(year, month - 1, day, hour, minute);

  if (hour < 4) {
    date.setDate(date.getDate() + 1);
  }

  return date.getTime();
}

function updateWorkHours(input, record) {
  const card = input.closest(".record-card");
  const workHours = card?.querySelector(".work-hours-value");

  if (workHours) {
    workHours.textContent = calculateWorkHours(record.startTime, record.endTime);
  }
}

function calculateWorkHours(startTime, endTime) {
  if (!startTime || !endTime) return "--";

  const diffMs = endTime - startTime;
  const diffHours = diffMs / 1000 / 60 / 60;

  return `${diffHours.toFixed(2)} 小时`;
}

function renderRecords() {
  if (records.length === 0) {
    recordList.innerHTML = `<div class="empty">暂无打卡记录</div>`;
    return;
  }

  const sortedRecords = [...records].sort((a, b) => {
    return b.dateKey.localeCompare(a.dateKey);
  });

  recordList.innerHTML = sortedRecords.map(record => {
    return `
      <article class="record-card">
        <div class="record-date">${formatDate(record.dateKey)}</div>

        <div class="record-grid">
          <div class="record-item">
            <div class="label">上班打卡时间</div>
            <input
              class="time-input"
              type="time"
              step="60"
              required
              value="${formatTimeInput(record.startTime)}"
              data-date-key="${record.dateKey}"
              data-field="startTime"
              aria-label="${formatDate(record.dateKey)} 上班打卡时间"
            />
          </div>

          <div class="record-item">
            <div class="label">下班打卡时间</div>
            <input
              class="time-input"
              type="time"
              step="60"
              value="${formatTimeInput(record.endTime)}"
              data-date-key="${record.dateKey}"
              data-field="endTime"
              aria-label="${formatDate(record.dateKey)} 下班打卡时间"
            />
          </div>

          <div class="record-item full">
            <div class="label">上班时长</div>
            <div class="value work-hours-value">${calculateWorkHours(record.startTime, record.endTime)}</div>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("读取本地打卡记录失败：", error);
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}