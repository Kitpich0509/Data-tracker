const firebaseConfig = {
  apiKey: "AIzaSyA6D-Go72dsfPi2MLzMFPx4TbONS201bjk",
  authDomain: "data-tracker-b87a5.firebaseapp.com",
  projectId: "data-tracker-b87a5",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// ELEMENTS
const email = document.getElementById("email");
const password = document.getElementById("password");
const modal = document.getElementById("modal");
const transactions = document.getElementById("transactions");
const income = document.getElementById("income");
const expense = document.getElementById("expense");
const profit = document.getElementById("profit");

// AUTH
window.register = () => auth.createUserWithEmailAndPassword(email.value, password.value);
window.login = () => auth.signInWithEmailAndPassword(email.value, password.value);
window.logout = () => auth.signOut();

// STATE
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

// MODAL
window.openModal = () => modal.style.display = "block";
window.closeModal = () => modal.style.display = "none";

// ADD TRANSACTION
window.addTransaction = () => {
  if (!currentUser) return alert("Login first");

  db.collection("transactions").add({
    type: type.value,
    amount: Number(amount.value),
    category: category.value,
    source: source.value,
    userId: currentUser,
    time: Date.now()
  }).then(() => {
    closeModal();
    loadTransactions();
  });
};

// LOAD DATA
window.loadTransactions = () => {
  transactions.innerHTML = "";

  let totalIncome = 0;
  let totalExpense = 0;

  db.collection("transactions")
    .where("userId", "==", currentUser)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        let data = doc.data();

        if (data.type === "income") totalIncome += data.amount || 0;
        else totalExpense += data.amount || 0;

        let div = document.createElement("div");
        div.innerHTML = `
          <b>${(data.type || "").toUpperCase()}</b> - $${data.amount || 0}<br>
          ${data.category || "-"} | ${data.source || "-"}
        `;
        transactions.appendChild(div);
      });

      income.innerText = totalIncome;
      expense.innerText = totalExpense;
      profit.innerText = totalIncome - totalExpense;
    });
};

// EXPORT PDF
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

    // SAFE FILTER
    if (startDate) {
      if (data.time) {
        if (data.time < startDate || data.time > endDate) return;
      }
    }

    if (data.type === "income") totalIncome += data.amount || 0;
    else totalExpense += data.amount || 0;

    rows += `
      <tr>
        <td>${data.type || "-"}</td>
        <td>$${data.amount || 0}</td>
        <td>${data.category || "-"}</td>
        <td>${data.source || "-"}</td>
      </tr>
    `;
  });

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

  // HTML REPORT
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

      <canvas id="reportChart" style="width:100%; height:200px;"></canvas>

      <br>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
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

  // CREATE CHART
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

  // 🔥 FIX: FORCE FULL RENDER (CRITICAL)
  await new Promise(resolve => setTimeout(resolve, 1500));
  await new Promise(requestAnimationFrame);

  // CAPTURE
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true
  });

  const imgData = canvas.toDataURL("image/png");

  const doc = new jsPDF("p", "mm", "a4");
  doc.addImage(imgData, "PNG", 10, 10, 190, 0);

  doc.save("financial_report.pdf");

  container.style.display = "none";
};
