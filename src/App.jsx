import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ScanBarcode,
  MapPin,
  AlertTriangle,
  Loader2,
  LogOut
} from "lucide-react";
import { motion } from "framer-motion";

// FIREBASE
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-6SJNbRovigmcCgTLXVsqfeII_GSgyXE",
  authDomain: "magazzino-zainetti.firebaseapp.com",
  projectId: "magazzino-zainetti",
  storageBucket: "magazzino-zainetti.firebasestorage.app",
  messagingSenderId: "751918853551",
  appId: "1:751918853551:web:0cb88f8c1513cacbf2535a",
  measurementId: "G-4EGD8EN8XG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* CONFIG MAGAZZINO */
const COLORS = [
  "Arancio","Giallo","Rosso","Marrone","Rosa",
  "Legno","Fucsia","Blu","Verde","Nero"
];
const X_AXIS = ["A","B","C","D"];
const Y_AXIS = ["1","2","3","4","5","6"];

export default function App() {

  /* 🔐 LOGIN STATE */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  /* APP STATE */
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [scanValue, setScanValue] = useState("");
  const [lastScan, setLastScan] = useState(null);
  const [loading, setLoading] = useState(true);

  const inputRef = useRef(null);

  /* SLOT */
  const allSlots = useMemo(() => {
    const slots = [];
    COLORS.forEach(color => {
      X_AXIS.forEach(x => {
        Y_AXIS.forEach(y => {
          slots.push({
            color,
            x,
            y,
            label: `${color} ${x}-${y}`
          });
        });
      });
    });
    return slots;
  }, []);

  /* 🔐 LOGIN */
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      alert("Credenziali sbagliate");
    }
  };

  /* 🚪 LOGOUT */
  const handleLogout = async () => {
    await signOut(auth);
  };

  /* AUTH LISTENER */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsub();
  }, []);

  /* FIRESTORE */
  useEffect(() => {
    if (!user) return;

    const ref = collection(db, "inventory");

    const unsub = onSnapshot(ref, (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setInventory(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  /* SCAN */
  const handleScan = async (e) => {
    e.preventDefault();

    const code = scanValue.trim();
    if (!code) return;

    const found = inventory.find(i => i.code === code);

    if (found) {
      setLastScan({ type: "FOUND", item: found });
    } else {
      const free = allSlots.find(slot =>
        !inventory.some(i => i.label === slot.label)
      );

      if (!free) {
        setLastScan({ type: "FULL", item: { code } });
      } else {
        const newItem = {
          code,
          label: free.label,
          color: free.color,
          x: free.x,
          y: free.y,
          createdAt: Date.now()
        };

        setLastScan({ type: "NEW", item: newItem });

        await setDoc(doc(collection(db, "inventory")), newItem);
      }
    }

    setScanValue("");
  };

  /* AUTOFOCUS */
  useEffect(() => {
    inputRef.current?.focus();
  }, [lastScan]);

  /* ⏳ LOADING */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  /* 🔐 SCHERMATA LOGIN */
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={handleLogin} className="bg-white p-6 rounded-xl shadow w-80">
          <h2 className="text-xl font-bold mb-4 text-center">Login</h2>

          <input
            type="email"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
            className="block mb-3 p-2 border w-full rounded"
          />

          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            className="block mb-3 p-2 border w-full rounded"
          />

          <button className="bg-blue-500 text-white px-4 py-2 w-full rounded">
            Entra
          </button>
        </form>
      </div>
    );
  }

  /* 📦 APP */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-6 flex flex-col items-center">

      {/* HEADER */}
      <div className="flex justify-between w-full max-w-md mb-4">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <ScanBarcode /> Magazzino
        </h1>

        <button onClick={handleLogout}>
          <LogOut />
        </button>
      </div>

      {/* INPUT */}
      <form onSubmit={handleScan} className="w-full max-w-md mb-6">
        <input
          ref={inputRef}
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          placeholder="Scansiona codice..."
          className="w-full px-6 py-4 rounded-2xl shadow border text-center text-xl"
        />
      </form>

      {/* RISULTATO */}
      {lastScan && (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="bg-white p-6 rounded-xl shadow w-full max-w-md text-center"
        >
          <h2 className="text-xl font-bold">{lastScan.item.code}</h2>

          {lastScan.type === "FULL" ? (
            <div className="text-red-500 mt-3">
              <AlertTriangle />
              <p>Pieno</p>
            </div>
          ) : (
            <>
              <p className="mt-3">Posizione</p>
              <h3 className="text-2xl font-black">
                {lastScan.item.x}-{lastScan.item.y}
              </h3>
              <MapPin />
            </>
          )}
        </motion.div>
      )}

      {/* LISTA */}
      <div className="mt-6 w-full max-w-md">
        {inventory.map(item => (
          <div key={item.id} className="bg-white p-3 rounded shadow mb-2 flex justify-between">
            <span>{item.code}</span>
            <span>{item.x}-{item.y}</span>
          </div>
        ))}
      </div>

    </div>
  );
}