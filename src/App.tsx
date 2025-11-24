import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Syringe,
  Scale,
  Activity,
  Plus,
  Trash2,
  Droplet,
  Calendar,
  Dumbbell,
  Percent,
  AlertCircle,
  Utensils,
  Cookie,
  CheckCircle2,
  Moon,
  Sun,
  ChefHat,
  Sparkles,
  Crown,
  AlertTriangle,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
  GoogleAuthProvider,
  linkWithPopup,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: 'AIzaSyBYypp0GuHSt_AOcR4_N6zd4PevzRvbrCI',
  authDomain: 'my-mounjaro-life.firebaseapp.com',
  projectId: 'my-mounjaro-life',
  storageBucket: 'my-mounjaro-life.firebasestorage.app',
  messagingSenderId: '252133959534',
  appId: '1:252133959534:web:25e7b7dff50d8bf9ba837f',
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'my-mounjaro-life';

// --- Types ---
interface InjectionRecord {
  id: string;
  date: string;
  dosage: string;
  site: string;
  notes: string;
  sideEffects?: string;
}
interface BodyRecord {
  id: string;
  date: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
}
interface DailyLog {
  id: string;
  date: string;
  category: 'water' | 'meal' | 'poop' | 'craving';
  subType?: string;
  value?: number;
  content?: string;
  timestamp?: any;
}

// --- UI Components ---
const Card = ({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden ${className}`}
  >
    {children}
  </div>
);

const PrimaryButton = ({
  onClick,
  icon: Icon,
  label,
  className = '',
  disabled = false,
}: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all hover:shadow-indigo-300 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {Icon && <Icon className="h-5 w-5" />} {label}
  </button>
);

const TabButton = ({ active, label, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
      active
        ? 'bg-slate-800 text-white shadow-md'
        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
    }`}
  >
    {label}
  </button>
);

// --- Main App ---
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'daily' | 'injections' | 'body'
  >('dashboard');
  const [loading, setLoading] = useState(true);

  // 滑動手勢相關 State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 定義頁籤順序
  const tabOrder = ['dashboard', 'daily', 'injections', 'body'] as const;

  // Data
  const [injections, setInjections] = useState<InjectionRecord[]>([]);
  const [bodyRecords, setBodyRecords] = useState<BodyRecord[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);

  // Forms
  const [injDate, setInjDate] =
