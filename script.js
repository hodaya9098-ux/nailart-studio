// ===== ניווט בין עמודים =====
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + pageId).classList.add("active");

  document.querySelectorAll(".nav-links a").forEach(a => {
    a.classList.toggle("active", a.dataset.page === pageId);
  });

  document.querySelector(".nav-links").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleMenu() {
  document.querySelector(".nav-links").classList.toggle("open");
}

// ===== סגנונות =====
function selectStyle(style, card) {
  document.querySelectorAll(".style-card").forEach(c => c.classList.remove("selected"));
  card.classList.add("selected");
  document.getElementById("chosenStyle").innerText = "נבחר סגנון: " + style;
  const s = document.getElementById("styleSelect");
  if (s) s.value = style;
}

// ===== מחיר =====
const services = [
  { name: "מניקור בסיסי", price: 80 },
  { name: "מניקור + לק ג'ל", price: 120 },
  { name: "בניית ציפורניים", price: 180 }
];

function calcPrice() {
  const select = document.getElementById("serviceType");
  const text = select.options[select.selectedIndex].text;
  const service = services.find(s => text.includes(s.name));
  document.getElementById("result").innerText = service
    ? `המחיר המשוער לשירות "${service.name}" הוא ${service.price} ₪`
    : "בחרי טיפול קודם";
}

// ===== הגדרות יומן =====
const HOURS = ["09:00","10:00","11:00","12:00","14:00","15:00","16:00","17:00"];
const DAY_NAMES = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
const ADMIN_PASSWORD = "1234";

let currentYear, currentMonth, selectedDate = null, selectedTime = null;

// ===== שמירה ב-localStorage =====
function getWorkingDays() {
  const saved = localStorage.getItem("workingDays");
  return saved ? JSON.parse(saved) : [0, 1, 2, 3, 4]; // א-ה כברירת מחדל
}

function getBlockedDates() {
  return JSON.parse(localStorage.getItem("blockedDates") || "[]");
}

function getBookedSlots() {
  return JSON.parse(localStorage.getItem("bookedSlots") || "{}");
}

function bookSlot(dateStr, time) {
  const booked = getBookedSlots();
  if (!booked[dateStr]) booked[dateStr] = [];
  booked[dateStr].push(time);
  localStorage.setItem("bookedSlots", JSON.stringify(booked));
}

// ===== לוגיקת זמינות =====
function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function toHebrewDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  const months = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  return `${parseInt(d)} ב${months[parseInt(m)-1]} ${y}`;
}

function getDayStatus(date) {
  const today = new Date();
  today.setHours(0,0,0,0);
  if (date < today) return "past";

  const dateStr = toDateStr(date);
  const workingDays = getWorkingDays();
  const blockedDates = getBlockedDates();

  if (!workingDays.includes(date.getDay())) return "unavailable";
  if (blockedDates.includes(dateStr)) return "unavailable";

  const bookedCount = (getBookedSlots()[dateStr] || []).length;
  if (bookedCount >= HOURS.length) return "full";

  return "available";
}

// ===== יומן =====
function initCalendar() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();
  renderCalendar();
}

function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  renderCalendar();
}

function renderCalendar() {
  const months = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  document.getElementById("calMonthLabel").textContent = `${months[currentMonth]} ${currentYear}`;

  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const today = new Date();
  today.setHours(0,0,0,0);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement("div")).className = "cal-day";
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(currentYear, currentMonth, d);
    const dateStr = toDateStr(date);
    const status = getDayStatus(date);

    const div = document.createElement("div");
    div.textContent = d;
    div.className = "cal-day " + status;

    if (toDateStr(date) === toDateStr(today)) div.classList.add("today");
    if (selectedDate === dateStr) div.classList.add("selected");

    if (status === "available") {
      div.onclick = () => selectDate(dateStr);
    }

    grid.appendChild(div);
  }
}

function selectDate(dateStr) {
  selectedDate = dateStr;
  selectedTime = null;
  renderCalendar();
  document.getElementById("selectedDateLabel").textContent = "תורים פנויים ל-" + toHebrewDate(dateStr);
  renderTimeSlots(dateStr);
  goToStep(2);
}

function renderTimeSlots(dateStr) {
  const booked = getBookedSlots()[dateStr] || [];
  const container = document.getElementById("timeSlots");
  container.innerHTML = "";

  HOURS.forEach(time => {
    const btn = document.createElement("button");
    btn.textContent = time;
    btn.type = "button";
    btn.className = "time-slot";

    if (booked.includes(time)) {
      btn.classList.add("booked");
      btn.disabled = true;
    } else {
      btn.onclick = () => selectTime(time, btn);
    }
    container.appendChild(btn);
  });
}

function selectTime(time, btn) {
  selectedTime = time;
  document.querySelectorAll(".time-slot").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  document.getElementById("bookingSummary").innerHTML =
    `📅 <strong>${toHebrewDate(selectedDate)}</strong> &nbsp;|&nbsp; 🕐 <strong>${time}</strong>`;
  goToStep(3);
}

function goToStep(n) {
  document.querySelectorAll(".booking-step").forEach(s => s.classList.add("hidden"));
  document.getElementById("step" + n).classList.remove("hidden");
}

function sendAppointment(e) {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const style = document.getElementById("styleSelect").value;
  const confirmMsg = document.getElementById("confirmMsg");

  if (!selectedDate || !selectedTime) {
    confirmMsg.className = "confirm-msg error";
    confirmMsg.innerText = "שגיאה: לא נבחר תאריך ושעה";
    return;
  }

  bookSlot(selectedDate, selectedTime);

  const styleTxt = style ? ` | סגנון: ${style}` : "";
  confirmMsg.className = "confirm-msg";
  confirmMsg.innerHTML = `✅ תודה <strong>${name}</strong>!<br>התור נקבע ל-<strong>${toHebrewDate(selectedDate)}</strong> בשעה <strong>${selectedTime}</strong>${styleTxt} 💅`;

  document.getElementById("appointmentForm").reset();
  selectedDate = null;
  selectedTime = null;

  setTimeout(() => {
    confirmMsg.innerHTML = "";
    renderCalendar();
    goToStep(1);
  }, 4000);
}

// ===== פאנל אדמין =====
let logoClickCount = 0;

document.getElementById("navLogo").addEventListener("click", () => {
  logoClickCount++;
  if (logoClickCount >= 5) {
    logoClickCount = 0;
    showPage("admin");
    document.querySelectorAll(".nav-links a").forEach(a => a.classList.remove("active"));
  }
});

function adminLogin() {
  const pass = document.getElementById("adminPass").value;
  if (pass === ADMIN_PASSWORD) {
    document.getElementById("adminLogin").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    renderAdminPanel();
  } else {
    document.getElementById("adminError").textContent = "סיסמה שגויה";
  }
}

function adminLogout() {
  document.getElementById("adminLogin").classList.remove("hidden");
  document.getElementById("adminPanel").classList.add("hidden");
  document.getElementById("adminPass").value = "";
  showPage("home");
}

function renderAdminPanel() {
  renderWorkingDays();
  renderBlockedList();
  renderAppointmentsList();
}

// ימי עבודה
function renderWorkingDays() {
  const working = getWorkingDays();
  const names = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
  const container = document.getElementById("workingDaysGrid");
  container.innerHTML = "";

  names.forEach((name, i) => {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.type = "button";
    btn.className = "day-toggle" + (working.includes(i) ? " active" : "");
    btn.onclick = () => { btn.classList.toggle("active"); };
    container.appendChild(btn);
  });
}

function saveWorkingDays() {
  const buttons = document.querySelectorAll(".day-toggle");
  const working = [];
  buttons.forEach((btn, i) => { if (btn.classList.contains("active")) working.push(i); });
  localStorage.setItem("workingDays", JSON.stringify(working));
  renderCalendar();
  alert("ימי העבודה נשמרו!");
}

// חסימת תאריכים
function blockDate() {
  const input = document.getElementById("blockDateInput");
  const dateStr = input.value;
  if (!dateStr) return;

  const blocked = getBlockedDates();
  if (!blocked.includes(dateStr)) {
    blocked.push(dateStr);
    localStorage.setItem("blockedDates", JSON.stringify(blocked));
    input.value = "";
    renderBlockedList();
    renderCalendar();
  }
}

function unblockDate(dateStr) {
  const blocked = getBlockedDates().filter(d => d !== dateStr);
  localStorage.setItem("blockedDates", JSON.stringify(blocked));
  renderBlockedList();
  renderCalendar();
}

function renderBlockedList() {
  const blocked = getBlockedDates();
  const container = document.getElementById("blockedList");
  container.innerHTML = "";

  if (blocked.length === 0) {
    container.innerHTML = '<p class="no-data">אין תאריכים חסומים</p>';
    return;
  }

  blocked.sort().forEach(dateStr => {
    const div = document.createElement("div");
    div.className = "blocked-item";
    div.innerHTML = `<span>${toHebrewDate(dateStr)}</span>
      <button class="remove-btn" onclick="unblockDate('${dateStr}')">✕</button>`;
    container.appendChild(div);
  });
}

// תורים שנקבעו
function renderAppointmentsList() {
  const booked = getBookedSlots();
  const container = document.getElementById("appointmentsList");
  container.innerHTML = "";

  const entries = Object.entries(booked)
    .flatMap(([date, times]) => times.map(t => ({ date, time: t })))
    .sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  if (entries.length === 0) {
    container.innerHTML = '<p class="no-data">אין תורים עדיין</p>';
    return;
  }

  entries.forEach(({ date, time }) => {
    const div = document.createElement("div");
    div.className = "appt-item";
    div.innerHTML = `<span>📅 ${toHebrewDate(date)}</span><span>🕐 ${time}</span>`;
    container.appendChild(div);
  });
}

// ===== אתחול =====
initCalendar();
showPage("home");
