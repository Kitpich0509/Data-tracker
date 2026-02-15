const firebaseConfig = {
  apiKey: "AIzaSyA6D-Go72dsfPi2MLzMFPx4TbONS201bjk",
  authDomain: "data-tracker-b87a5.firebaseapp.com",
  projectId: "data-tracker-b87a5",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// AUTH
function register() {
  auth.createUserWithEmailAndPassword(email.value, password.value);
}

function login() {
  auth.signInWithEmailAndPassword(email.value, password.value);
}

function logout() {
  auth.signOut();
}

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
function openModal() {
  modal.style.display = "block";
}

function closeModal() {
  modal.style.display = "none";
}

// ADD TRANSACTION
function addTransaction() {
  db.collection("transactions").add({
    type: type.value,
    amount: Number(amount.value),
    category: category.value,
    source: source.value,
    userId: currentUser,
    time: Date.now()
  });

  closeModal();
  loadTransactions();
}

// LOAD DATA
function loadTransactions() {
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
}
