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
}) => {
  // 基礎樣式
  const baseClass = `bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden relative z-10 text-left ${className}`;
  
  // 如果有 onClick，渲染為 button 以優化手機觸控體驗
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClass} w-full hover:shadow-md transition-transform active:scale-[0.98] cursor-pointer`}
        type="button"
      >
        {children}
      </button>
    );
  }

  // 否則渲染為普通 div
  return <div className={baseClass}>{children}</div>;
};

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
    className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
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
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);
  
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
  const [waterBottleSize, setWaterBottleSize] = useState(1200); // 預設 1200ml
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

  // --- Handlers: 智慧滑動切換邏輯 ---
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const minSwipeDistance = 75; // 增加最小滑動距離，避免誤觸點擊

    // 【重要】防誤觸邏輯：
    // 1. 如果水平移動小於 75px，視為點擊，不切換頁籤
    if (Math.abs(distanceX) < minSwipeDistance) return;

    // 2. 如果垂直移動 > 水平移動，視為捲動，不切換頁籤
    if (Math.abs(distanceY) > Math.abs(distanceX)) return;

    const currentIndex = tabOrder.indexOf(activeTab as any);

    if (distanceX > minSwipeDistance) { // 左滑 -> 下一個
      if (currentIndex < tabOrder.length - 1) {
        setActiveTab(tabOrder[currentIndex + 1]);
      }
    } else if (distanceX < -minSwipeDistance) { // 右滑 -> 上一個
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

  // 修正：排便天數改為計算「選定日期」當下的狀態
  const lastPoopBeforeSelected = useMemo(() => {
     return dailyLogs
      .filter(l => l.category === 'poop' && l.date <= selectedDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [dailyLogs, selectedDate]);

  const daysSincePoop = useMemo(() => {
    if (!lastPoopBeforeSelected) return -1;

    const [sY, sM, sD] = selectedDate.split('-').map(Number);
    const current = new Date(sY, sM - 1, sD);

    const [pY, pM, pD] = lastPoopBeforeSelected.date.split('-').map(Number);
    const last = new Date(pY, pM - 1, pD);

    const diffTime = current.getTime() - last.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [lastPoopBeforeSelected, selectedDate]);

  const chartData = useMemo(() => {
    return [...bodyRecords]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => ({ ...item, displayDate: item.date.slice(5) }));
  }, [bodyRecords]);

  const latestWeight = bodyRecords[0]?.weight;
  const startWeight = bodyRecords[bodyRecords.length - 1]?.weight;
  const totalLoss =
    startWeight && latestWeight ? (startWeight - latestWeight).toFixed(1) : 0;

  // --- Logic: Achievements Generation ---
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
      // 加入滑動監聽
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 w-full h-full bg-[#F8FAFC] text-slate-800 font-sans flex flex-col overflow-y-auto overflow-x-hidden pb-24"
    >
      <div className="fixed top-0 left-0 w-full h-64 bg-gradient-to-br from-indigo-50 via-purple-50 to-white -z-10" />

      <header className="pt-8 pb-6 px-6 relative z-50">
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
            className={`h-10 w-10 rounded-full shadow-md flex items-center justify-center border transition-all cursor-pointer z-50 ${
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

      <div className="px-6 mb-6 sticky top-2 z-40">
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
          <TabButton
            active={activeTab === 'achievements'}
            label="成就"
            onClick={() => setActiveTab('achievements')}
          />
        </div>
      </div>

      <main className="px-6 max-w-md mx-auto space-y-6 animate-fade-in flex-1 w-full relative z-10">
        {/* --- DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                給自己的一句話
              </h2>
              <Card className="p-4 bg-white/50 border-indigo-100/50">
                <p className="text-indigo-900 font-medium text-center italic">
                  "{randomQuote}"
                </p>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card 
                className="p-5 group"
                onClick={() => setActiveTab('body')}
              >
                <p className="text-slate-400 text-xs font-bold mb-1 flex items-center gap-1">
                  目前體重 <span className="text-slate-300 text-[10px] group-hover:text-indigo-400">↗</span>
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-800">
                    {latestWeight || '--'}
                  </span>
                  <span className="text-sm text-slate-400">kg</span>
                </div>
              </Card>
              <Card className="p-5 bg-gradient-to-br from-indigo-600 to-violet-600 text-white border-none">
                <p className="text-indigo-100 text-xs font-bold mb-1">
                  總共減去
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {totalLoss > 0 ? totalLoss : '0'}
                  </span>
                  <span className="text-sm text-indigo-100 opacity-80">kg</span>
                </div>
              </Card>
            </div>

            <Card className="p-5">
              <h3 className="font-bold text-slate-700 mb-4">
                今日概況 ({selectedDate.slice(5)})
              </h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div 
                  onClick={() => setActiveTab('daily')}
                  className="bg-blue-50 rounded-xl p-3 cursor-pointer hover:bg-blue-100 transition-colors active:scale-95"
                >
                  <Droplet className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                  <span className="text-sm font-bold text-slate-700">
                    {waterTotal}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    ml 水分
                  </span>
                </div>
                <div 
                  onClick={() => setActiveTab('daily')}
                  className="bg-orange-50 rounded-xl p-3 cursor-pointer hover:bg-orange-100 transition-colors active:scale-95"
                >
                  <Utensils className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                  <span className="text-sm font-bold text-slate-700">
                    {meals.length}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    餐記錄
                  </span>
                </div>

                {(() => {
                  const hasPoopToday = todaysLogs.some(l => l.category === 'poop');
                  return (
                    <div
                      onClick={() => setActiveTab('daily')}
                      className={`rounded-xl p-3 cursor-pointer transition-colors active:scale-95 ${
                        hasPoopToday
                          ? 'bg-green-50 hover:bg-green-100'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle2
                        className={`h-5 w-5 mx-auto mb-1 ${
                          hasPoopToday
                            ? 'text-green-500'
                            : 'text-slate-300'
                        }`}
                      />
                      <span
                        className={`text-sm font-bold ${
                          hasPoopToday
                            ? 'text-green-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {hasPoopToday ? '已打卡' : '未記錄'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">排便</span>
                    </div>
                  );
                })()}

                <div 
                  onClick={() => setActiveTab('daily')}
                  className="bg-pink-50 rounded-xl p-3 cursor-pointer hover:bg-pink-100 transition-colors active:scale-95"
                >
                  <Cookie className="h-5 w-5 text-pink-500 mx-auto mb-1" />
                  <span className="text-sm font-bold text-slate-700">
                    {todaysLogs.filter((l) => l.category === 'craving').length}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    嘴饞次數
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-5 pb-0 h-64">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase">
                  體重 & 體脂趨勢
                </p>
                <div className="flex gap-3 text-[10px] font-bold">
                  <div className="flex items-center gap-1 text-indigo-600">
                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                    體重
                  </div>
                  <div className="flex items-center gap-1 text-teal-500">
                    <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                    體脂
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="displayDate"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    domain={['auto', 'auto']}
                    hide={true} 
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={['auto', 'auto']}
                    hide={true}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ marginBottom: '8px', color: '#64748b', fontSize: '12px' }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="weight"
                    name="體重"
                    unit="kg"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fill="url(#colorWeight)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="bodyFat"
                    name="體脂"
                    unit="%"
                    stroke="#14b8a6"
                    strokeWidth={3}
                    fill="url(#colorFat)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}

        {/* --- DAILY LIFE --- */}
        {activeTab === 'daily' && (
          <div className="space-y-6">
            
            {/* 日期選擇器 (隱形覆蓋法) */}
            <div className="flex items-center justify-between bg-white p-2 rounded-2xl shadow-sm border border-slate-100 gap-2">
              <button
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg active:scale-90 transition-transform shrink-0"
              >
                ←
              </button>
              
              <div className="relative flex-1 h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center gap-2 overflow-hidden">
                {/* 視覺層 */}
                <Calendar className="h-4 w-4 text-indigo-500 pointer-events-none" />
                <span className="text-slate-700 font-bold text-sm pointer-events-none">{selectedDate}</span>
                
                {/* 觸控層 */}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(e.target.value);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
              </div>

              <button
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg active:scale-90 transition-transform shrink-0"
              >
                →
              </button>
            </div>

            {/* 皇冠日曆卡片 (現在可以點擊切換了！) */}
            <Card className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" /> 
                  飲水達標記錄 ({new Date().getMonth() + 1}月)
                </h3>
                <div className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                  ≥ 3000ml
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                  <div key={d} className="text-xs text-slate-400 font-medium py-1">
                    {d}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = today.getMonth();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const firstDayOfMonth = new Date(year, month, 1).getDay();

                  const days = [];
                  for (let i = 0; i < firstDayOfMonth; i++) {
                    days.push(<div key={`empty-${i}`} />);
                  }

                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const dayWater = dailyLogs
                      .filter(l => l.category === 'water' && l.date === dateStr)
                      .reduce((acc, curr) => acc + (curr.value || 0), 0);
                    
                    const isAchieved = dayWater >= 3000;
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const isSelected = dateStr === selectedDate;

                    days.push(
                      <div
                        key={d}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs relative border cursor-pointer transition-all active:scale-95
                          ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 z-10' : ''}
                          ${
                            isAchieved
                              ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-200'
                              : isToday
                              ? 'bg-white border-blue-200 text-blue-600 font-bold'
                              : 'bg-slate-50/50 text-slate-400 border-transparent hover:bg-slate-100'
                          }`}
                      >
                        <span className="z-10">{d}</span>
                        {isAchieved && (
                          <Crown className="absolute -top-2 -right-2 h-4 w-4 text-yellow-400 fill-yellow-400 drop-shadow-sm" />
                        )}
                      </div>
                    );
                  }
                  return days;
                })()}
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-blue-500 to-blue-400 text-white">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="font-bold flex items-center gap-2 mb-2 text-blue-50">
                    <Droplet className="h-5 w-5" /> 今日飲水
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <div className="text-5xl sm:text-6xl font-extrabold leading-none">
                      {waterTotal}
                    </div>
                    <span className="text-xl font-bold text-blue-100">ml</span>
                  </div>
                  <div className="text-sm text-blue-100 mt-1">
                    目標: 3000ml
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm ml-4 shrink-0 text-center">
                  <label className="block text-xs font-bold mb-1 text-blue-100">
                    水瓶設定
                  </label>
                  <div className="flex items-center justify-center">
                    <input
                      type="number"
                      value={waterBottleSize}
                      onChange={(e) => setWaterBottleSize(Number(e.target.value))}
                      className="w-16 bg-transparent text-center text-xl font-bold outline-none border-b-2 border-blue-100/30 focus:border-blue-100 py-0 text-white"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => addDailyLog('water', null, waterBottleSize, null)} 
                  className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 rounded-xl flex flex-col items-center transition-all active:scale-95 col-span-2 border border-white/10"
                >
                  <span className="text-sm text-blue-100">加入一杯</span>
                  <span className="text-xl">+{waterBottleSize}ml</span>
                </button>
                <button
                  onClick={() => {
                    const custom = prompt('輸入水量 (ml):');
                    if (custom) addDailyLog('water', null, Number(custom), null);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 border border-white/10"
                >
                  <Plus className="h-6 w-6 mb-1" />
                  <span className="text-sm text-blue-100">自訂</span>
                </button>
              </div>

              {todaysLogs.filter((l) => l.category === 'water').length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap gap-2">
                  {todaysLogs
                    .filter((l) => l.category === 'water')
                    .map((log) => (
                      <button
                        key={log.id}
                        onClick={() => deleteItem('daily_logs', log.id)}
                        className="bg-white/20 hover:bg-red-500/50 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-colors"
                        title="點擊刪除"
                      >
                        {log.value}ml <span className="opacity-60">×</span>
                      </button>
                    ))}
                </div>
              )}
            </Card>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 pl-1">
                <Utensils className="h-5 w-5 text-orange-500" /> 飲食記錄
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'breakfast', label: '早餐', icon: Sun },
                  { id: 'lunch', label: '午餐', icon: ChefHat },
                  { id: 'dinner', label: '晚餐', icon: Moon },
                  { id: 'snack', label: '點心', icon: Cookie },
                ].map((meal) => {
                  const mealLogs = todaysLogs.filter(
                    (l) => l.category === 'meal' && l.subType === meal.id
                  );
                  const hasLog = mealLogs.length > 0;
                  
                  return (
                    <button
                      key={meal.id}
                      onClick={() => setActiveMealType(meal.id as any)}
                      className={`p-4 rounded-2xl border text-left transition-all min-h-[120px] flex flex-col ${
                        hasLog
                          ? 'bg-orange-50 border-orange-200 shadow-sm'
                          : 'bg-white border-slate-100 hover:border-orange-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`${
                            hasLog ? 'text-orange-600' : 'text-slate-300'
                          }`}
                        >
                          <meal.icon className="h-6 w-6" />
                        </div>
                        <div className="font-bold text-slate-700">
                          {meal.label}
                        </div>
                      </div>
                      
                      {hasLog ? (
                         <div className="mt-auto space-y-1">
                           {mealLogs.map(log => (
                             <div key={log.id} className="text-sm font-medium text-slate-600 bg-white/60 px-2 py-1 rounded border border-orange-100/50 truncate">
                               {log.content}
                             </div>
                           ))}
                         </div>
                      ) : (
                        <div className="text-xs text-slate-400 mt-auto">
                           尚未記錄
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {activeMealType && (
                <Card className="p-4 bg-orange-50/50 border-orange-100 animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-orange-800">
                      記錄
                      {activeMealType === 'breakfast'
                        ? '早餐'
                        : activeMealType === 'lunch'
                        ? '午餐'
                        : activeMealType === 'dinner'
                        ? '晚餐'
                        : '點心'}
                    </h4>
                    <button
                      onClick={() => setActiveMealType(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>
                  <textarea
                    value={mealContent}
                    onChange={(e) => setMealContent(e.target.value)}
                    placeholder="吃了什麼呢？"
                    className="w-full bg-white rounded-xl p-3 border border-orange-100 focus:ring-2 focus:ring-orange-200 outline-none text-sm min-h-[80px]"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() =>
                        addDailyLog('meal', activeMealType, null, mealContent)
                      }
                      disabled={!mealContent}
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-orange-600 disabled:opacity-50"
                    >
                      儲存
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {todaysLogs
                      .filter(
                        (l) =>
                          l.category === 'meal' && l.subType === activeMealType
                      )
                      .map((log) => (
                        <div
                          key={log.id}
                          className="bg-white p-2 rounded-lg text-sm text-slate-600 flex justify-between group"
                        >
                          <span>{log.content}</span>
                          <button
                            onClick={() => deleteItem('daily_logs', log.id)}
                            className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </Card>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 pl-1">
                <Activity className="h-5 w-5 text-purple-500" /> 身體反應
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 flex flex-col items-center text-center">
                  <div className="bg-green-50 p-3 rounded-full mb-3 text-green-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-slate-700 mb-1">排便記錄</h4>
                  <p className={`text-xs font-bold mb-4 ${
                    daysSincePoop > 2 ? 'text-orange-400' : 'text-slate-400'
                  }`}>
                    {daysSincePoop === -1 
                      ? '尚無紀錄' 
                      : daysSincePoop === 0 
                      ? '就是今天' 
                      : daysSincePoop === 1 
                      ? '昨天' 
                      : `距離上次 ${daysSincePoop} 天`}
                  </p>
                  
                  {(() => {
                    const poopCount = todaysLogs.filter(l => l.category === 'poop').length;
                    return (
                      <button
                        onClick={() => addDailyLog('poop', null, null, '排便打卡')}
                        className={`w-full py-2 rounded-xl font-bold text-sm transition-all ${
                          poopCount > 0 
                            ? 'bg-green-600 text-white shadow-md shadow-green-200' 
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {poopCount > 0 ? `今日累積 ${poopCount} 次` : '+ 記錄一次'}
                      </button>
                    );
                  })()}

                  <div className="mt-3 w-full text-left space-y-1">
                    {todaysLogs
                      .filter((l) => l.category === 'poop')
                      .map((log) => (
                        <div
                          key={log.id}
                          className="flex justify-between text-xs text-green-600 bg-green-50 px-2 py-1 rounded"
                        >
                          <span>已記錄</span>
                          <button
                            onClick={() => deleteItem('daily_logs', log.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                </Card>

                <Card className="p-4 flex flex-col items-center text-center">
                  <div className="bg-pink-50 p-3 rounded-full mb-3 text-pink-500">
                    <Cookie className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-slate-700 mb-1">嘴饞記錄</h4>
                  <p className="text-xs text-slate-400 mb-4">想吃但不餓？</p>
                  
                  {(() => {
                    const cravingCount = todaysLogs.filter(l => l.category === 'craving').length;
                    return (
                      <button
                        onClick={() => addDailyLog('craving', null, null, '嘴饞記錄')}
                        className={`w-full py-2 rounded-xl font-bold text-sm transition-all ${
                          cravingCount > 0 
                            ? 'bg-pink-500 text-white shadow-md shadow-pink-200' 
                            : 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                        }`}
                      >
                        {cravingCount > 0 ? `今日累積 ${cravingCount} 次` : '+ 記錄一次'}
                      </button>
                    );
                  })()}

                  <div className="mt-3 w-full text-left space-y-1">
                    {todaysLogs
                      .filter((l) => l.category === 'craving')
                      .map((log) => (
                        <div
                          key={log.id}
                          className="flex justify-between text-xs text-pink-600 bg-pink-50 px-2 py-1 rounded"
                        >
                          <span>嘴饞</span>
                          <button
                            onClick={() => deleteItem('daily_logs', log.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* --- INJECTIONS --- */}
        {activeTab === 'injections' && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-500" /> 
                  本月記錄 ({new Date().getMonth() + 1}月)
                </h3>
                <div className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                  ● 紫色圓點為注射日
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                  <div key={d} className="text-xs text-slate-400 font-medium py-1">
                    {d}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = today.getMonth();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const firstDayOfMonth = new Date(year, month, 1).getDay();

                  const days = [];
                  for (let i = 0; i < firstDayOfMonth; i++) {
                    days.push(<div key={`empty-${i}`} />);
                  }

                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const record = injections.find((i) => i.date === dateStr);
                    const isToday = dateStr === new Date().toISOString().split('T')[0];

                    days.push(
                      <div
                        key={d}
                        className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs relative border 
                          ${
                            record
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                              : isToday
                              ? 'bg-white border-indigo-200 text-indigo-600 font-bold'
                              : 'bg-slate-50/50 text-slate-400 border-transparent'
                          }`}
                      >
                        <span className="z-10">{d}</span>
                        {record && (
                          <span className="absolute -bottom-1.5 bg-white text-indigo-600 text-[8px] px-1 rounded-full font-bold shadow-sm border border-indigo-100 scale-90">
                            {record.dosage}
                          </span>
                        )}
                      </div>
                    );
                  }
                  return days;
                })()}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4" /> 新增注射
              </h3>
              <div className="space-y-4">
                <input
                  type="date"
                  value={injDate}
                  onChange={(e) => setInjDate(e.target.value)}
                  className="w-full bg-slate-50 p-3 rounded-xl font-bold text-slate-700"
                />
                <div className="grid grid-cols-3 gap-2">
                  {['2.5', '5.0', '7.5', '10.0', '12.5', '15.0'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setInjDosage(d)}
                      className={`py-2 rounded-xl text-sm font-bold ${
                        injDosage === d
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['左上腹', '左下腹', '右上腹', '右下腹'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInjSite(s)}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                        injSite === s
                          ? 'border-indigo-600 text-indigo-700 bg-indigo-50 shadow-sm'
                          : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                
                <input
                  type="text"
                  value={injSideEffects}
                  onChange={(e) => setInjSideEffects(e.target.value)}
                  placeholder="副作用 (例如：噁心、頭暈...)"
                  className="w-full bg-red-50 border border-red-100 p-3 rounded-xl text-sm text-red-700 placeholder:text-red-300"
                />

                <textarea
                  value={injNotes}
                  onChange={(e) => setInjNotes(e.target.value)}
                  placeholder="備註..."
                  className="w-full bg-slate-50 p-3 rounded-xl text-sm h-20 resize-none"
                />
                <PrimaryButton onClick={addInjection} label="儲存" />
              </div>
            </Card>
            <div className="space-y-3">
              {injections.map((i) => (
                <Card
                  key={i.id}
                  className="p-4 flex flex-col gap-2"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                        <Syringe className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{i.date}</div>
                        <div className="text-xs text-slate-500">
                          {i.dosage}mg • {i.site}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteItem('injections', i.id)}
                      className="text-slate-300 hover:text-red-400"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {i.sideEffects && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-2 text-xs text-red-700 flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>副作用：{i.sideEffects}</span>
                    </div>
                  )}
                  
                  {i.notes && (
                    <div className="text-xs text-slate-500 pl-11">
                      備註: {i.notes}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* --- BODY --- */}
        {activeTab === 'body' && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-5">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Scale className="h-4 w-4" /> 身體數據
              </h3>
              <div className="space-y-4">
                <input
                  type="date"
                  value={bodyDate}
                  onChange={(e) => setBodyDate(e.target.value)}
                  className="w-full bg-slate-50 p-3 rounded-xl font-bold text-slate-700"
                />
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="體重 (kg)"
                  className="w-full bg-indigo-50/50 border-2 border-indigo-100 p-4 rounded-2xl text-center text-3xl font-extrabold text-indigo-600 focus:outline-none focus:border-indigo-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.1"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                    placeholder="體脂 %"
                    className="w-full bg-slate-50 p-3 rounded-xl font-bold text-center"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={muscleMass}
                    onChange={(e) => setMuscleMass(e.target.value)}
                    placeholder="肌肉 kg"
                    className="w-full bg-slate-50 p-3 rounded-xl font-bold text-center"
                  />
                </div>
                <PrimaryButton onClick={addBody} label="儲存" />
              </div>
            </Card>
            <div className="space-y-3">
              {bodyRecords.map((r) => (
                <Card
                  key={r.id}
                  className="p-4 flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg min-w-[50px] text-center">
                      <div className="text-xs font-bold text-slate-500">
                        {r.date.slice(5)}
                      </div>
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-800 text-lg">
                        {r.weight}{' '}
                        <span className="text-sm font-normal text-slate-400">
                          kg
                        </span>
                      </div>
                      <div className="flex gap-2 text-[10px]">
                        {r.bodyFat && (
                          <span className="bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded font-bold">
                            體脂 {r.bodyFat}%
                          </span>
                        )}
                        {r.muscleMass && (
                          <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-bold">
                            肌肉 {r.muscleMass}kg
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteItem('measurements', r.id)}
                    className="text-slate-300 hover:text-red-400"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* --- ACHIEVEMENTS (新功能：成就時間軸) --- */}
        {activeTab === 'achievements' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-2 px-2">
              <div className="p-3 bg-yellow-100 rounded-full text-yellow-600 shadow-sm">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">我的成就旅程</h2>
                <p className="text-xs text-slate-400">回顧每一個努力的瞬間</p>
              </div>
            </div>

            {/* 時間軸容器 */}
            <div className="relative pl-4 space-y-6 before:content-[''] before:absolute before:left-[27px] before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-100">
              {achievements.length > 0 ? (
                achievements.map((event, index) => (
                  <div key={index} className="relative pl-10">
                    {/* 時間軸上的圓點圖示 */}
                    <div className={`absolute left-0 top-0 w-14 h-14 rounded-full border-4 border-white shadow-md flex items-center justify-center z-10 ${event.color}`}>
                      <event.icon className="h-6 w-6" />
                    </div>
                    
                    {/* 內容卡片 */}
                    <Card className="p-4 ml-2">
                      <div className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {event.date}
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg mb-1">
                        {event.title}
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        {event.description}
                      </p>
                    </Card>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-400 pl-6">
                  <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>紀錄還在累積中...</p>
                  <p className="text-xs mt-1">持續記錄，這裡就會出現您的故事喔！</p>
                </div>
              )}
            </div>
            
            {/* 底部激勵小語 */}
            <div className="text-center py-6 text-slate-300 text-xs italic">
              "每一步都算數，繼續加油！"
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
