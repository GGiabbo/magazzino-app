import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ScanBarcode,
  MapPin,
  PackagePlus,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";

// Firebase
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
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

// CONFIG MAGAZZINO
const COLORS = [
  "Arancio","Giallo","Rosso","Marrone","Rosa",
  "Legno","Fucsia","Blu","Verde","Nero"
];
const X_AXIS = ["A","B","C","D"];
const Y_AXIS = ["1","2","3","4","5","6"];

export default function App() {

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

  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [scanValue, setScanValue] = useState("");
  const [lastScan, setLastScan] = useState(null);
  const [loading, setLoading] = useState(true);

  const inputRef = useRef(null);

  // AUTH
  useEffect(() => {
    signInAnonymously(auth);
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // FIRESTORE SYNC
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

  // SCAN
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

  // AUTO FOCUS
  useEffect(() => {
    inputRef.current?.focus();
  }, [lastScan]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-6 flex flex-col items-center">

      {/* HEADER */}
      <h1 className="text-3xl font-black flex items-center gap-2 mb-6">
        <ScanBarcode /> Magazzino Smart
      </h1>

      {/* INPUT */}
      <form onSubmit={handleScan} className="w-full max-w-md mb-6">
        <input
          ref={inputRef}
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          placeholder="Scansiona codice..."
          className="w-full px-6 py-4 rounded-2xl shadow-lg border focus:ring-4 focus:ring-blue-300 text-center text-xl"
        />
      </form>

      {/* RESULT */}
      {lastScan && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md text-center"
        >
          <p className="text-gray-400">Codice</p>
          <h2 className="text-2xl font-bold">{lastScan.item.code}</h2>

          {lastScan.type === "FULL" ? (
            <div className="text-red-500 mt-4">
              <AlertTriangle size={40} />
              <p>Magazzino pieno</p>
            </div>
          ) : (
            <>
              <p className="text-gray-400 mt-4">Posizione</p>
              <h3 className="text-3xl font-black">
                {lastScan.item.color} {lastScan.item.x}-{lastScan.item.y}
              </h3>
              <MapPin className="mx-auto mt-2" />
            </>
          )}
        </motion.div>
      )}

      {/* LISTA */}
      <div className="mt-8 w-full max-w-md">
        {inventory.map(item => (
          <div
            key={item.id}
            className="bg-white p-3 rounded-xl shadow mb-2 flex justify-between"
          >
            <span>{item.code}</span>
            <span className="font-bold">{item.x}-{item.y}</span>
          </div>
        ))}
      </div>

    </div>
  );
}