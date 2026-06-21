// ===== FIREBASE =====
const firebaseConfig = {
  apiKey: "AIzaSyBGGY8JSM0SxUsYkj4qEIFEMDMGwN0Ss_w",
  authDomain: "inbalmoshe-37596.firebaseapp.com",
  databaseURL: "https://inbalmoshe-37596-default-rtdb.firebaseio.com",
  projectId: "inbalmoshe-37596",
  storageBucket: "inbalmoshe-37596.firebasestorage.app",
  messagingSenderId: "475050324020",
  appId: "1:475050324020:web:006bfca2445621e8d3da61",
  measurementId: "G-NE3RS6RTWV"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===== Cache מקומי =====
let cache = {
  bookedSlots:  {},
  workingDays:  [0, 1, 2, 3, 4],
  blockedDates: []
};
let dbReady = false;

function getBookedSlots()  { return cache.bookedSlots; }
function getWorkingDays()  { return cache.workingDays; }
function getBlockedDates() { return cache.blockedDates; }

// טעינה ראשונית + האזנה לשינויים בזמן אמת
db.ref("/").on("value", snap => {
  const data = snap.val() || {};
  cache.bookedSlots  = data.bookedSlots  || {};
  cache.workingDays  = data.workingDays  || [0, 1, 2, 3, 4];
  cache.blockedDates = data.blockedDates || [];

  if (!dbReady) {
    dbReady = true;
    initCalendar();
    if (document.getElementById("workingDaysGrid")) renderAdminPanel();
  } else {
    if (document.getElementById("calendarGrid")) renderCalendar();
    if (document.getElementById("appointmentsList")) renderAppointmentsList();
  }
});

function bookSlot(dateStr, time) {
  if (!cache.bookedSlots[dateStr]) cache.bookedSlots[dateStr] = [];
  cache.bookedSlots[dateStr].push(time);
  db.ref("bookedSlots/" + dateStr).set(cache.bookedSlots[dateStr]);
}

function saveWorkingDays() {
  const working = [];
  document.querySelectorAll(".day-toggle").forEach((btn, i) => {
    if (btn.classList.contains("active")) working.push(i);
  });
  cache.workingDays = working;
  db.ref("workingDays").set(working);
  const msg = document.getElementById("savedMsg");
  if (msg) { msg.textContent = "ימי העבודה נשמרו!"; setTimeout(() => msg.textContent = "", 2500); }
}

function blockDate() {
  const input = document.getElementById("blockDateInput");
  const dateStr = input.value;
  if (!dateStr) return;
  if (!cache.blockedDates.includes(dateStr)) {
    cache.blockedDates.push(dateStr);
    db.ref("blockedDates").set(cache.blockedDates);
    input.value = "";
    renderBlockedList();
  }
}

function unblockDate(dateStr) {
  cache.blockedDates = cache.blockedDates.filter(d => d !== dateStr);
  db.ref("blockedDates").set(cache.blockedDates);
  renderBlockedList();
}

function clearAllAppointments() {
  if (confirm("למחוק את כל התורים לצמיתות?")) {
    cache.bookedSlots = {};
    db.ref("bookedSlots").remove();
    renderAppointmentsList();
  }
}

// ===== תפריט נייד =====
function toggleMenu() {
  document.querySelector(".nav-links").classList.toggle("open");
}

// ===== סגנונות =====
function selectStyle(style, card) {
  document.querySelectorAll(".style-card, .style-card-new, .swatch-card").forEach(c => c.classList.remove("selected"));
  card.classList.add("selected");

  const el = document.getElementById("chosenStyle");
  if (el) el.innerText = "נבחר: " + style;

  const banner = document.getElementById("chosenBanner");
  if (banner) banner.classList.remove("hidden");

  const s = document.getElementById("styleSelect");
  if (s) s.value = style;
}

// ===== מחיר =====
let nailQty = 1;

function changeQty(delta) {
  const check = document.getElementById("nailCompleteCheck");
  nailQty = Math.min(10, Math.max(1, nailQty + delta));
  document.getElementById("nailQty").textContent = nailQty;
  document.getElementById("nailCompletePrice").textContent = (nailQty * 10) + " ₪";
  if (nailQty > 1) check.checked = true;
  calcTotal();
}

function calcTotal() {
  const checkboxes = document.querySelectorAll('.calc-item input[type="checkbox"]:checked');
  let total = 0;
  checkboxes.forEach(cb => {
    if (cb.id === "nailCompleteCheck") {
      total += nailQty * 10;
    } else {
      total += parseInt(cb.value);
    }
  });
  const el = document.getElementById("totalAmount");
  const box = document.getElementById("totalBox");
  if (el) {
    el.textContent = total + " ₪";
    box.style.background = total > 0 ? "linear-gradient(135deg,#ff8fab,#e75480)" : "#f5f5f5";
    box.style.color = total > 0 ? "#fff" : "#333";
  }
}

function resetCalc() {
  document.querySelectorAll('.calc-item input[type="checkbox"]').forEach(cb => cb.checked = false);
  nailQty = 1;
  const qtyEl = document.getElementById("nailQty");
  const priceEl = document.getElementById("nailCompletePrice");
  if (qtyEl) qtyEl.textContent = "1";
  if (priceEl) priceEl.textContent = "10 ₪";
  calcTotal();
}

function calcPrice() {}

// ===== יומן =====
const HOURS = ["09:00","10:00","11:00","12:00","14:00","15:00","16:00","17:00"];
const ADMIN_PASSWORD = "1234";

let currentYear, currentMonth, selectedDate = null, selectedTime = null;

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function toHebrewDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  const months = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  return `${parseInt(d)} ב${months[parseInt(m)-1]} ${y}`;
}

function getDayStatus(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  if (date < today) return "past";
  const dateStr = toDateStr(date);
  if (!getWorkingDays().includes(date.getDay())) return "unavailable";
  if (getBlockedDates().includes(dateStr)) return "unavailable";
  const bookedCount = (getBookedSlots()[dateStr] || []).length;
  if (bookedCount >= HOURS.length) return "full";
  return "available";
}

function initCalendar() {
  if (!document.getElementById("calendarGrid")) return;
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
  if (!document.getElementById("calMonthLabel")) return;
  const months = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  document.getElementById("calMonthLabel").textContent = `${months[currentMonth]} ${currentYear}`;

  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const today = new Date(); today.setHours(0,0,0,0);
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();

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
    if (status === "available") div.onclick = () => selectDate(dateStr);

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
    btn.className = "time-slot" + (booked.includes(time) ? " booked" : "");
    btn.disabled = booked.includes(time);
    if (!booked.includes(time)) btn.onclick = () => selectTime(time, btn);
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

const COSMETICIAN_PHONE = "972503927121";

function sendAppointment(e) {
  e.preventDefault();
  const name    = document.getElementById("name").value.trim();
  const phone   = document.getElementById("phone").value.trim();
  const service = document.getElementById("serviceSelect") ? document.getElementById("serviceSelect").value : "";
  const style   = document.getElementById("styleSelect")   ? document.getElementById("styleSelect").value  : "";
  const note    = document.getElementById("note")          ? document.getElementById("note").value.trim()  : "";
  const confirmMsg = document.getElementById("confirmMsg");

  if (!selectedDate || !selectedTime) {
    confirmMsg.className = "confirm-msg error";
    confirmMsg.innerText = "שגיאה: לא נבחר תאריך ושעה";
    return;
  }
  if (!service) {
    confirmMsg.className = "confirm-msg error";
    confirmMsg.innerText = "אנא בחרי סוג טיפול";
    return;
  }

  bookSlot(selectedDate, selectedTime);

  let msg = `שלום! רציתי לאשר תור 💅\n`;
  msg += `━━━━━━━━━━━━━━\n`;
  msg += `👤 שם: ${name}\n`;
  if (phone) msg += `📞 טלפון: ${phone}\n`;
  msg += `📅 תאריך: ${toHebrewDate(selectedDate)}\n`;
  msg += `🕐 שעה: ${selectedTime}\n`;
  msg += `🛠️ טיפול: ${service}\n`;
  if (style) msg += `💅 עיצוב: ${style}\n`;
  if (note)  msg += `📝 הערות: ${note}\n`;
  msg += `━━━━━━━━━━━━━━`;

  const waURL = `https://wa.me/${COSMETICIAN_PHONE}?text=${encodeURIComponent(msg)}`;

  confirmMsg.className = "confirm-msg";
  confirmMsg.innerHTML = `✅ מעולה <strong>${name}</strong>! עוד שנייה תועברי לוואטסאפ לאישור התור 💬`;

  document.getElementById("appointmentForm").reset();
  selectedDate = null;
  selectedTime = null;

  setTimeout(() => window.open(waURL, "_blank"), 1200);

  setTimeout(() => {
    confirmMsg.innerHTML = "";
    renderCalendar();
    goToStep(1);
  }, 5000);
}

// ===== אדמין =====
function adminLogin() {
  if (document.getElementById("adminPass").value === ADMIN_PASSWORD) {
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
  window.location.href = "index.html";
}

function renderAdminPanel() {
  renderWorkingDays();
  renderBlockedList();
  renderAppointmentsList();
}

function renderWorkingDays() {
  const working = getWorkingDays();
  const names = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
  const container = document.getElementById("workingDaysGrid");
  if (!container) return;
  container.innerHTML = "";
  names.forEach((name, i) => {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.type = "button";
    btn.className = "day-toggle" + (working.includes(i) ? " active" : "");
    btn.onclick = () => btn.classList.toggle("active");
    container.appendChild(btn);
  });
}

function renderBlockedList() {
  const blocked = getBlockedDates();
  const container = document.getElementById("blockedList");
  if (!container) return;
  container.innerHTML = blocked.length === 0
    ? '<p class="no-data">אין תאריכים חסומים</p>'
    : blocked.sort().map(d =>
        `<div class="blocked-item"><span>${toHebrewDate(d)}</span><button class="remove-btn" onclick="unblockDate('${d}')">✕</button></div>`
      ).join("");
}

function renderAppointmentsList() {
  const booked = getBookedSlots();
  const container = document.getElementById("appointmentsList");
  if (!container) return;
  const entries = Object.entries(booked)
    .flatMap(([date, times]) => times.map(t => ({ date, time: t })))
    .sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  container.innerHTML = entries.length === 0
    ? '<p class="no-data">אין תורים עדיין</p>'
    : entries.map(({ date, time }) =>
        `<div class="appt-item"><span>📅 ${toHebrewDate(date)}</span><span>🕐 ${time}</span></div>`
      ).join("");
}
