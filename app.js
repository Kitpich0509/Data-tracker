

const firebaseConfig = {
  apiKey: "AIzaSyA6D-Go72dsfPi2MLzMFPx4TbONS201bjk",
  authDomain: "data-tracker-b87a5.firebaseapp.com",
  projectId: "data-tracker-b87a5",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// ✅ GET ELEMENTS (VERY IMPORTANT FIX)
const email = document.getElementById("email");
const password = document.getElementById("password");
const modal = document.getElementById("modal");
const transactions = document.getElementById("transactions");
const income = document.getElementById("income");
const expense = document.getElementById("expense");
const profit = document.getElementById("profit");

// ✅ AUTH FUNCTIONS (MAKE GLOBAL)
window.register = function () {
  auth.createUserWithEmailAndPassword(email.value, password.value);
};

window.login = function () {
  auth.signInWithEmailAndPassword(email.value, password.value);
};

window.logout = function () {
  auth.signOut();
};

// ✅ STATE
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user.uid;

    document.getElementById("auth").style.display = "none";
    document.getElementById("app").style.display = "block";

    loadTransactions();
  } else {
    document.getElementById("auth").style.display = "block";
    document.getElementById("app").style.display = "none";
  }
});

// ✅ MODAL
window.openModal = function () {
  modal.style.display = "block";
};

window.closeModal = function () {
  modal.style.display = "none";
};

// ✅ ADD TRANSACTION
window.addTransaction = function () {
  if (!currentUser) return alert("Login first");

  db.collection("transactions").add({
    type: document.getElementById("type").value,
    amount: Number(document.getElementById("amount").value),
    category: document.getElementById("category").value,
    source: document.getElementById("source").value,
    userId: currentUser,
    time: Date.now()
  }).then(() => {
    closeModal();
    loadTransactions();
  });
};

// ✅ LOAD DATA
window.loadTransactions = function () {
  transactions.innerHTML = "";

  let totalIncome = 0;
  let totalExpense = 0;

  db.collection("transactions")
    .where("userId", "==", currentUser)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        let data = doc.data();

        if (data.type === "income") totalIncome += data.amount;
        else totalExpense += data.amount;

        let div = document.createElement("div");
        div.innerHTML = `
          <b>${data.type.toUpperCase()}</b> - $${data.amount}<br>
          ${data.category} | ${data.source}
        `;

        transactions.appendChild(div);
      });

      income.innerText = totalIncome;
      expense.innerText = totalExpense;
      profit.innerText = totalIncome - totalExpense;
    });
};

// ✅ EXPORT PDF (GLOBAL)
window.exportPDF = async function () {

  const { jsPDF } = window.jspdf;
  const container = document.getElementById("pdfContent");

  const selectedMonth = document.getElementById("reportMonth").value;
  const userEmail = auth.currentUser.email;

  let startDate = null;
  let endDate = null;

  if (selectedMonth) {
    let [year, month] = selectedMonth.split("-");
    startDate = new Date(year, month - 1, 1).getTime();
    endDate = new Date(year, month, 0, 23, 59, 59).getTime();
  }

  const snapshot = await db.collection("transactions")
    .where("userId", "==", currentUser)
    .get();

  let totalIncome = 0;
  let totalExpense = 0;
  let rows = "";

  snapshot.forEach(doc => {
    const data = doc.data();

    // ✅ FIXED FILTER (safe for old + new data)
    if (startDate) {
      if (data.time) {
        if (data.time < startDate || data.time > endDate) return;
      }
      // if no time → still include
    }

    // ✅ totals
    if (data.type === "income") totalIncome += data.amount || 0;
    else totalExpense += data.amount || 0;

    // ✅ ALWAYS add row safely
    rows += `
      <tr>
        <td>${data.type || "-"}</td>
        <td>$${data.amount || 0}</td>
        <td>${data.category || "-"}</td>
        <td>${data.source || "-"}</td>
      </tr>
    `;
  });

  // ✅ empty state
  if (!rows) {
    rows = `
      <tr>
        <td colspan="4" style="text-align:center;padding:15px;color:#888;">
          📭 No transactions found
        </td>
      </tr>
    `;
  }

  let profit = totalIncome - totalExpense;

  // 🎨 PREMIUM HTML
  container.innerHTML = `
    <div style="font-family:'Noto Sans Khmer',sans-serif; padding:20px;">
      
      <div style="background:#0f172a;color:white;padding:15px;border-radius:10px;">
        <h2>📊 Money Tracker Report</h2>
        <p>👤 ${userEmail}</p>
        <p>📅 ${selectedMonth || "All"}</p>
      </div>

      <div style="display:flex;gap:10px;margin:15px 0;">
        <div style="flex:1;background:#16a34a;color:white;padding:10px;border-radius:10px;">
          💵 Income<br><b>$${totalIncome}</b>
        </div>
        <div style="flex:1;background:#dc2626;color:white;padding:10px;border-radius:10px;">
          💸 Expense<br><b>$${totalExpense}</b>
        </div>
        <div style="flex:1;background:#2563eb;color:white;padding:10px;border-radius:10px;">
          📈 Profit<br><b>$${profit}</b>
        </div>
      </div>

      <!-- 📊 CHART -->
      <canvas id="reportChart" style="width:100%; height:200px;"></canvas>

      <br>

      <table style="width:100%;border-collapse:collapse;">
        <tr style="background:#eee;">
          <th style="padding:8px;">Type</th>
          <th>Amount</th>
          <th>Category</th>
          <th>Source</th>
        </tr>
        ${rows}
      </table>

    </div>
  `;

  container.style.display = "block";

  // 📊 CREATE CHART
  const ctx = document.getElementById("reportChart").getContext("2d");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Income", "Expense"],
      datasets: [{
        label: "Amount",
        data: [totalIncome, totalExpense],
        backgroundColor: ["#16a34a", "#dc2626"]
      }]
    },
    options: {
      responsive: true,
      animation: false
    }
  });

  // ✅ FIX: wait longer + force render (mobile fix)
  await new Promise(resolve => setTimeout(resolve, 1000));
  await new Promise(requestAnimationFrame);

  // 📸 CAPTURE
  const canvas = await html2canvas(container);
  const imgData = canvas.toDataURL("image/png");

  const doc = new jsPDF("p", "mm", "a4");
  doc.addImage(imgData, "PNG", 10, 10, 190, 0);

  doc.save("financial_report.pdf");

  container.style.display = "none";
};







