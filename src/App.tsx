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
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
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
// 【重要】請在這裡填入您從 Firebase 網站複製的資訊
// 請將下方引號內的內容替換成您的真實金鑰
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
const appId = 'my-mounjaro-life'; // 固定的 App ID

// --- Types ---
interface InjectionRecord {
  id: string;
  date: string;
  dosage: string;
  site: string;
  notes: string;
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
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
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
  const quotes = [
    '我不是在追求完美，我是在學著對自己更溫柔、更持續。',
    '即使進度很慢，我也在扎實地向更健康的自己靠近。',
    '壓力再高，我也值得擁有一個穩定、輕鬆的生活節奏。',
    '每一次我願意為自己做一點小事，都是在奠定我未來的力量。',
    '我正在把身體、心情與生活重新調成我想要的樣子。',
    '情緒起伏不代表我失敗，它只是提醒我要更照顧自己。',
    '我已經比昨天更懂得怎麼讓身體舒服、心更安穩。',
    '我的努力不需要被看見才有價值——我自己知道。',
    '我願意相信，持續照顧自己的我，一定會慢慢瘦、慢慢更自在。',
    '不急，我走得慢也沒關係，我會一直走下去，而這就值得驕傲。',
    '我不需要急著瘦下來，我只要每天微微前進一點點，身體就會慢慢回到我值得擁有的樣子。',
  ];

  const randomQuote = useMemo(() => {
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, []);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'daily' | 'injections' | 'body'
  >('dashboard');
  const [loading, setLoading] = useState(true);

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

  // --- Auth & Load ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error('Auth Error', e);
      }
    };
    initAuth();
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
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
  const addInjection = async () => {
    if (!user) return;
    await addDoc(
      collection(db, 'artifacts', appId, 'users', user.uid, 'injections'),
      {
        date: injDate,
        dosage: injDosage,
        site: injSite,
        notes: injNotes,
        createdAt: serverTimestamp(),
      }
    );
    setInjNotes('');
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

  const chartData = useMemo(() => {
    return [...bodyRecords]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => ({ ...item, displayDate: item.date.slice(5) }));
  }, [bodyRecords]);

  const latestWeight = bodyRecords[0]?.weight;
  const startWeight = bodyRecords[bodyRecords.length - 1]?.weight;
  const totalLoss =
    startWeight && latestWeight ? (startWeight - latestWeight).toFixed(1) : 0;

  if (loading)
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-24 flex flex-col">
        載入健康數據...
      </div>
    );

  // ... 前面的程式碼保持不變 ...

  return (
    // 修正 1: 在最外層加入 'flex flex-col'
    <div className="fixed inset-0 w-full h-full bg-[#F8FAFC] text-slate-800 font-sans flex flex-col overflow-y-auto overflow-x-hidden pb-24">
      {/* 背景漸層保持不變 */}
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
          <div className="h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center border border-indigo-50">
            <Activity className="h-5 w-5 text-indigo-600" />
          </div>
        </div>
      </header>

      <div className="px-6 mb-6 sticky top-2 z-30">
        <div className="max-w-md mx-auto bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-lg shadow-slate-200/50 border border-white/50 flex">
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
        </div>
      </div>

      {/* 修正 2: 在 main 加入 'flex-1' 和 'w-full' */}
      <main className="px-6 max-w-md mx-auto space-y-6 animate-fade-in flex-1 w-full">
        {/* --- DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <>
            {/* ▼▼▼ 新增這個語錄卡片 ▼▼▼ */}
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
            {/* ▲▲▲ 新增結束 ▲▲▲ */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-5">
                <p className="text-slate-400 text-xs font-bold mb-1">
                  目前體重
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
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-blue-50 rounded-xl p-3">
                  <Droplet className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                  <span className="text-sm font-bold text-slate-700">
                    {waterTotal}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    ml 水分
                  </span>
                </div>
                <div className="bg-orange-50 rounded-xl p-3">
                  <Utensils className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                  <span className="text-sm font-bold text-slate-700">
                    {meals.length}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    餐記錄
                  </span>
                </div>
                <div
                  className={`rounded-xl p-3 ${
                    lastPoop?.date === selectedDate
                      ? 'bg-green-50'
                      : 'bg-slate-50'
                  }`}
                >
                  <CheckCircle2
                    className={`h-5 w-5 mx-auto mb-1 ${
                      lastPoop?.date === selectedDate
                        ? 'text-green-500'
                        : 'text-slate-300'
                    }`}
                  />
                  <span
                    className={`text-sm font-bold ${
                      lastPoop?.date === selectedDate
                        ? 'text-green-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {lastPoop?.date === selectedDate ? '已打卡' : '未記錄'}
                  </span>
                  <span className="text-[10px] text-slate-400 block">排便</span>
                </div>
              </div>
            </Card>

            {/* 修正 3 (選用): 如果希望總覽頁面的圖表能填滿下方剩餘空間，
                可以將 h-64 改為 flex-1 min-h-[250px]，並確保父層也有 flex 設定。
                目前暫時保持 h-64 避免圖表變形。
            */}
            <Card className="p-5 pb-0 h-64">
              <p className="text-xs font-bold text-slate-400 uppercase mb-4">
                體重趨勢
              </p>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
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
                    tick={{ fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fill="url(#cw)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}

        {/* --- DAILY LIFE --- */}
        {activeTab === 'daily' && (
          <div className="space-y-6">
            {/* ... 日常頁面的內容保持不變 ... */}
            {/* 為了節省篇幅，這裡省略中間內容，請保留您原本的程式碼 */}
            {/* 這裡放入原本 daily 的所有內容 */}
            <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
              <button
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg"
              >
                ←
              </button>
              <div className="font-bold text-slate-700 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" /> {selectedDate}
              </div>
              <button
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg"
              >
                →
              </button>
            </div>

            <Card className="p-5 bg-gradient-to-br from-blue-500 to-cyan-400 text-white border-none relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/20 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-blue-50 flex items-center gap-2">
                      <Droplet className="h-5 w-5" /> 今日飲水
                    </h3>
                    <div className="text-4xl font-extrabold mt-2">
                      {waterTotal}{' '}
                      <span className="text-lg font-normal opacity-80">ml</span>
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 text-center min-w-[80px]">
                    <div className="text-[10px] font-bold uppercase opacity-70 mb-1">
                      水瓶設定
                    </div>
                    <input
                      type="number"
                      value={waterBottleSize}
                      onChange={(e) =>
                        setWaterBottleSize(Number(e.target.value))
                      }
                      className="w-full bg-transparent text-center font-bold text-white border-b border-white/30 focus:outline-none focus:border-white text-lg"
                    />
                  </div>
                </div>
                <button
                  onClick={() =>
                    addDailyLog('water', null, waterBottleSize, null)
                  }
                  className="w-full bg-white text-blue-600 py-3 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-transform flex justify-center items-center gap-2"
                >
                  <Plus className="h-5 w-5" /> 喝了一瓶 ({waterBottleSize}ml)
                </button>

                {todaysLogs.filter((l) => l.category === 'water').length >
                  0 && (
                  <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
                    <p className="text-xs font-bold text-blue-100">今日記錄</p>
                    <div className="flex flex-wrap gap-2">
                      {todaysLogs
                        .filter((l) => l.category === 'water')
                        .map((log) => (
                          <div
                            key={log.id}
                            className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2"
                          >
                            {log.value}ml
                            <button
                              onClick={() => deleteItem('daily_logs', log.id)}
                              className="hover:text-red-200"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
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
                  const hasLog = todaysLogs.some(
                    (l) => l.category === 'meal' && l.subType === meal.id
                  );
                  return (
                    <button
                      key={meal.id}
                      onClick={() => setActiveMealType(meal.id as any)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        hasLog
                          ? 'bg-orange-50 border-orange-200 shadow-sm'
                          : 'bg-white border-slate-100 hover:border-orange-200'
                      }`}
                    >
                      <div
                        className={`mb-2 ${
                          hasLog ? 'text-orange-600' : 'text-slate-300'
                        }`}
                      >
                        <meal.icon className="h-6 w-6" />
                      </div>
                      <div className="font-bold text-slate-700">
                        {meal.label}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {hasLog ? '已記錄 (點擊新增)' : '尚未記錄'}
                      </div>
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
                  <p className="text-xs text-slate-400 mb-4">
                    上次: {lastPoop ? lastPoop.date.slice(5) : '無'}
                  </p>
                  <button
                    onClick={() => addDailyLog('poop', null, null, '排便打卡')}
                    className="w-full py-2 bg-green-100 text-green-700 rounded-xl font-bold text-sm hover:bg-green-200"
                  >
                    + 記錄一次
                  </button>
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
                  <button
                    onClick={() =>
                      addDailyLog('craving', null, null, '嘴饞記錄')
                    }
                    className="w-full py-2 bg-pink-100 text-pink-600 rounded-xl font-bold text-sm hover:bg-pink-200"
                  >
                    + 記錄一次
                  </button>
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
                  className="p-4 flex justify-between items-center"
                >
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
      </main>
    </div>
  );
}
