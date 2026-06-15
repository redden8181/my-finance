import { useState, useEffect } from 'react';
import { StoreProvider, useAppStore } from './store/StoreContext';
import HomeScreen from './components/HomeScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import AddTransactionScreen from './components/AddTransactionScreen';
import SettingsScreen from './components/SettingsScreen';
import DebtsScreen from './components/DebtsScreen';
import { Plus, Settings } from 'lucide-react';

type Tab = 'home' | 'analytics';

function AppContent() {
  const { settings } = useAppStore();
  const [tab, setTab] = useState<Tab>('home');
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDebts, setShowDebts] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const isDark = settings.theme === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.body.style.backgroundColor = isDark ? '#111827' : '#ffffff';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#111827' : '#ffffff');
    }
  }, [isDark]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="relative w-full h-full max-w-[430px] max-h-[932px] bg-white dark:bg-gray-900 flex flex-col overflow-hidden sm:rounded-3xl sm:shadow-2xl sm:border sm:border-gray-200 dark:sm:border-gray-700">
        {!isOnline && (
          <div className="bg-amber-500 text-white text-xs font-medium text-center py-1 px-2 flex-shrink-0">
            📴 Офлайн
          </div>
        )}

        <div className="safe-top flex-shrink-0" />

        <div className="flex-shrink-0 px-4 pt-2 pb-3 flex items-center gap-3">
          <div className="flex-1 flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setTab('home')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === 'home'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              Главная
            </button>
            <button
              onClick={() => setTab('analytics')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === 'analytics'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              Аналитика
            </button>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
          >
            <Settings size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          {tab === 'home' && <HomeScreen onOpenDebts={() => setShowDebts(true)} />}
          {tab === 'analytics' && <AnalyticsScreen />}
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="absolute right-5 w-14 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 active:scale-90 transition-all z-10"
          style={{ bottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 12px))' }}
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>

        {showAdd && <AddTransactionScreen onClose={() => setShowAdd(false)} />}
        {showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}
        {showDebts && <DebtsScreen onClose={() => setShowDebts(false)} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
