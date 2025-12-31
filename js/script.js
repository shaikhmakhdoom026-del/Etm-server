let todayAmount = 0;
let todayCount = 0;
let weekly = JSON.parse(localStorage.getItem("weekly")) || {
  sun:0, mon:0, tue:0, wed:0, thu:0, fri:0, sat:0
};

function selectFare(amount) {
  document.getElementById("status").innerText =
    "₹" + amount + " selected. Tap NFC Card (demo)";

  // demo simulate card tap
  setTimeout(() => {
    todayAmount += amount;
    todayCount++;

    let day = new Date().getDay();
    let map = ["sun","mon","tue","wed","thu","fri","sat"];
    weekly[map[day]] += amount;

    localStorage.setItem("weekly", JSON.stringify(weekly));

    document.getElementById("todayAmount").innerText = "₹" + todayAmount;
    document.getElementById("todayCount").innerText = todayCount + " transactions";
    document.getElementById("weeklyAmount").innerText =
      "₹" + Object.values(weekly).reduce((a,b)=>a+b,0);

    document.getElementById("status").innerText = "Ticket issued ✔";
  }, 800);
}

function openWeekly() {
  window.location.href = "weekly.html";
}

function goBack() {
  window.location.href = "index.html";
}

if (location.pathname.includes("weekly")) {
  Object.keys(weekly).forEach(d => {
    document.getElementById(d).innerText = weekly[d];
  });
}
