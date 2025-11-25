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
  Trophy,
  Medal,
  Zap,
  TrendingDown,
  Star,
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

interface AchievementItem {
  date: string;
  type: 'injection' | 'water_goal' | 'water_streak' | 'weight_loss';
  title: string;
  description: string;
  icon: any;
  color: string;
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
    className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 ${
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
    'dashboard' | 'daily' | 'injections' | 'body' | 'achievements'
  >('dashboard');
  const [loading, setLoading] = useState(true);

  // 滑動手勢 State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const tabOrder = ['dashboard', 'daily', 'injections', 'body', 'achievements'] as const;

  // Data
  const [injections, setInjections] = useState<InjectionRecord[]>([]);
  const [bodyRecords, setBodyRecords] = useState<BodyRecord[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);

  // Forms
  const [injDate, setInjDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [injDosage, setInjDosage] = useState('2.5');
  const [injSite, setInjSite] = useState('左上腹');
  const [injNotes, setInjNotes] = useState('');
  const [injSideEffects, setInjSideEffects] = useState('');
  const [bodyDate, setBodyDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');

  // Forms - Daily Life
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [waterBottleSize, setWaterBottleSize] = useState(1200);
  const [mealContent, setMealContent] = useState('');
  const [activeMealType, setActiveMealType] = useState<
    'breakfast' | 'lunch' | 'dinner' | 'snack' | null
  >(null);

  // 語錄
  const quotes = [
    "我不是在追求完美，我是在學著對自己更溫柔、更持續。",
    "即使進度很慢，我也在扎實地向更健康的自己靠近。",
    "壓力再高，我也值得擁有一個穩定、輕鬆的生活節奏。",
    "每一次我願意為自己做一點小事，都是在奠定我未來的力量。",
    "我正在把身體、心情與生活重新調成我想要的樣子。",
    "情緒起伏不代表我失敗，它只是提醒我要更照顧自己。",
    "我已經比昨天更懂得怎麼讓身體舒服、心更安穩。",
    "我的努力不需要被看見才有價值——我自己知道。",
    "我願意相信，持續照顧自己的我，一定會慢慢瘦、慢慢更自在。",
    "不急，我走得慢也沒關係，我會一直走下去，而這就值得驕傲。",
    "我不需要急著瘦下來，我只要每天微微前進一點點，身體就會慢慢回到我值得擁有的樣子。",
  ];

  const randomQuote = useMemo(() => {
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, []);

  // --- Auth Logic ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        signInAnonymously(auth).catch((err) => console.error("Login Error:", err));
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Realtime Listeners ---
  useEffect(() => {
    if (!user) return;

    const unsubInj = onSnapshot(
      collection(db, 'artifacts', appId, 'users', user.uid, 'injections'),
      (snap) => {
        const data = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as InjectionRecord)
        );
        setInjections(
          data.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        );
      }
    );

    const unsubBody = onSnapshot(
      collection(db, 'artifacts', appId, 'users', user.uid, 'measurements'),
      (snap) => {
        const data = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as BodyRecord)
        );
        setBodyRecords(
          data.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        );
      }
    );

    const unsubDaily = onSnapshot(
      collection(db, 'artifacts', appId, 'users', user.uid, 'daily_logs'),
      (snap) => {
        const data = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as DailyLog)
        );
        setDailyLogs(data);
      }
    );

    return () => {
      unsubInj();
      unsubBody();
      unsubDaily();
    };
  }, [user]);

  // --- Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50; 
    const currentIndex = tabOrder.indexOf(activeTab as any);

    if (distance > minSwipeDistance) {
      if (currentIndex < tabOrder.length - 1) {
        setActiveTab(tabOrder[currentIndex + 1]);
      }
    } else if (distance < -minSwipeDistance) {
      if (currentIndex > 0) {
        setActiveTab(tabOrder[currentIndex - 1]);
      }
    }
  };

  const addInjection = async () => {
    if (!user) return;
    await addDoc(
      collection(db, 'artifacts', appId, 'users', user.uid, 'injections'),
      {
        date: injDate,
        dosage: injDosage,
        site: injSite,
        notes: injNotes,
        sideEffects: injSideEffects,
        createdAt: serverTimestamp(),
      }
    );
    setInjNotes('');
    setInjSideEffects('');
    alert('注射記錄已儲存');
  };

  const addBody = async () => {
    if (!user || !weight) return;
    await addDoc(
      collection(db, 'artifacts', appId, 'users', user.uid, 'measurements'),
      {
        date: bodyDate,
        weight: parseFloat(weight),
        bodyFat: bodyFat ? parseFloat(bodyFat) : null,
        muscleMass: muscleMass ? parseFloat(muscleMass) : null,
        createdAt: serverTimestamp(),
      }
    );
    setWeight('');
    setBodyFat('');
    setMuscleMass('');
    alert('體重記錄已儲存');
  };

  const addDailyLog = async (
    category: string,
    subType: string | null,
    value: number | null,
    content: string | null
  ) => {
    if (!user) return;
    await addDoc(
      collection(db, 'artifacts', appId, 'users', user.uid, 'daily_logs'),
      {
        date: selectedDate,
        category,
        subType,
        value,
        content,
        createdAt: serverTimestamp(),
      }
    );
    if (category === 'meal') {
      setMealContent('');
      setActiveMealType(null);
    }
  };

  const deleteItem = async (coll: string, id: string) => {
    if (!confirm('確定刪除?')) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, coll, id));
  };

  const handleLinkGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      if (auth.currentUser) {
        await linkWithPopup(auth.currentUser, provider);
        alert("綁定成功！您的資料現在永久安全了 🎉");
        setUser({ ...auth.currentUser });
      }
    } catch (error: any) {
      console.error("Binding Error:", error);
      if (error.code === 'auth/credential-already-in-use') {
        const wantToSwitch = window.confirm(
          "這個 Google 帳號已經有舊資料了！\n\n您是否要切換回該帳號？\n(注意：目前這個空白的暫存記錄將會消失)"
        );
        if (wantToSwitch) {
          try {
            await signInWithPopup(auth, provider);
          } catch (signInError) {
            console.error("Sign In Error:", signInError);
            alert("登入失敗，請稍後再試。");
          }
        }
      } else {
        alert("操作失敗：" + error.message);
      }
    }
  };

  const handleLogout = async () => {
    if (confirm("確定要登出嗎？\n(登出後將建立一個新的訪客身分)")) {
      await signOut(auth);
      window.location.reload();
    }
  };

  // --- Computed Data ---
  const todaysLogs = dailyLogs.filter((l) => l.date === selectedDate);
  const waterTotal = todaysLogs
    .filter((l) => l.category === 'water')
    .reduce((acc, curr) => acc + (curr.value || 0), 0);
  const meals = todaysLogs.filter((l) => l.category === 'meal');
  const poops = dailyLogs
    .filter((l) => l.category === 'poop')
    .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
  const lastPoop = poops[0];

  const daysSincePoop = useMemo(() => {
    if (!lastPoop) return -1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = lastPoop.date.split('-').map(Number);
    const last = new Date(y, m - 1, d);
    const diffTime = today.getTime() - last.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [lastPoop]);

  const chartData = useMemo(() => {
    return [...bodyRecords]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => ({ ...item, displayDate: item.date.slice(5) }));
  }, [bodyRecords]);

  const latestWeight = bodyRecords[0]?.weight;
  const startWeight = bodyRecords[bodyRecords.length - 1]?.weight;
  const totalLoss =
    startWeight && latestWeight ? (startWeight - latestWeight).toFixed(1) : 0;

  const achievements = useMemo(() => {
    const events: AchievementItem[] = [];
    const seenDosages = new Set<string>();
    const sortedInjections = [...injections].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sortedInjections.forEach((inj, index) => {
      if (index === 0) {
        events.push({
          date: inj.date,
          type: 'injection',
          title: '旅程的起點',
          description: `第一次注射 Mounjaro ${inj.dosage}mg，美好的開始！`,
          icon: Syringe,
          color: 'text-purple-500 bg-purple-100',
        });
        seenDosages.add(inj.dosage);
      } else if (!seenDosages.has(inj.dosage)) {
        events.push({
          date: inj.date,
          type: 'injection',
          title: '劑量升級',
          description: `劑量調整為 ${inj.dosage}mg，持續前進。`,
          icon: Activity,
          color: 'text-purple-600 bg-purple-50',
        });
        seenDosages.add(inj.dosage);
      }
    });

    if (bodyRecords.length > 0) {
      const sortedBody = [...bodyRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const startW = sortedBody[0].weight;
      let maxLossMilestone = 0;

      sortedBody.forEach(record => {
        const currentLoss = startW - record.weight;
        if (currentLoss >= 1) {
          const milestone = Math.floor(currentLoss);
          if (milestone > maxLossMilestone) {
            maxLossMilestone = milestone;
            events.push({
              date: record.date,
              type: 'weight_loss',
              title: `減重里程碑 -${milestone}kg`,
              description: `太棒了！您已經總共減去了 ${milestone} 公斤！`,
              icon: TrendingDown,
              color: 'text-indigo-600 bg-indigo-100',
            });
          }
        }
      });
    }

    const waterByDate: Record<string, number> = {};
    dailyLogs.filter(l => l.category === 'water').forEach(l => {
      waterByDate[l.date] = (waterByDate[l.date] || 0) + (l.value || 0);
    });

    const sortedDates = Object.keys(waterByDate).sort();
    let streak = 0;

    sortedDates.forEach(date => {
      if (waterByDate[date] >= 3000) {
        events.push({
          date: date,
          type: 'water_goal',
          title: '飲水達標',
          description: `今日喝水量達到 ${waterByDate[date]}ml，身體感謝您！`,
          icon: Droplet,
          color: 'text-blue-500 bg-blue-100',
        });

        streak++;
        if (streak === 3 || streak === 7 || streak === 14 || streak === 30) {
          events.push({
            date: date,
            type: 'water_streak',
            title: `連續 ${streak} 天喝水達標`,
            description: `不可思議的毅力！保持水潤 ${streak} 天了！`,
            icon: Zap,
            color: 'text-orange-500 bg-orange-100',
          });
        }
      } else {
        streak = 0;
      }
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [injections, bodyRecords, dailyLogs]);


  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        載入健康數據...
      </div>
    );

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 w-full h-full bg-[#F8FAFC] text-slate-800 font-sans flex flex-col overflow-y-auto overflow-x-hidden pb-24"
    >
      <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-br from-indigo-50 via-purple-50 to-white -z-10" />

      <header className="pt-8 pb-6 px-6">
        <div className="max-w-md mx-auto flex justify-between items-end">
          <div>
            <p className="text-slate-400 text-xs font-bold tracking-wider uppercase mb-1">
              Mounjaro Life
            </p>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
              健康日記<span className="text-indigo-600">.</span>
            </h1>
          </div>
          <button
            onClick={user?.isAnonymous ? handleLinkGoogle : handleLogout}
            className={`h-10 w-10 rounded-full shadow-md flex items-center justify-center border transition-all cursor-pointer ${
              user?.isAnonymous
                ? 'bg-white border-indigo-50 hover:bg-indigo-50'
                : 'bg-indigo-600 border-indigo-600 hover:opacity-90'
            }`}
            title={user?.isAnonymous ? "點擊綁定/登入" : "點擊登出"}
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="User"
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <Activity
                className={`h-5 w-5 ${
                  user?.isAnonymous ? 'text-indigo-600' : 'text-white'
                }`}
              />
            )}
          </button>
        </div>
      </header>

      <div className="px-6 mb-6 sticky top-2 z-30">
        <div className="max-w-md mx-auto bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-lg shadow-slate-200/50 border border-white/50 flex overflow-x-auto">
          <TabButton
            active={activeTab === 'dashboard'}
            label="總覽"
            onClick={() => setActiveTab('dashboard')}
          />
          <TabButton
            active={activeTab === 'daily'}
            label="日常"
            onClick={() => setActiveTab('daily')}
          />
          <TabButton
            active={activeTab === 'injections'}
            label="注射"
            onClick={() => setActiveTab('injections')}
          />
          <TabButton
            active={activeTab === 'body'}
            label="體重"
            onClick={() => setActiveTab('body')}
          />
