import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '../store/StoreContext';
import { ArrowLeft, Sun, Moon, Trash2, Tag, Plus, Check, Edit3, Download, Upload } from 'lucide-react';
import type { TransactionType, Category } from '../types';

interface Props {
  onClose: () => void;
}

const STORAGE_KEY = 'koshelek_app_data';

export default function SettingsScreen({ onClose }: Props) {
  const { settings, setTheme, resetAllData, categories, addCategory, updateCategory, deleteCategory } = useAppStore();

  const [showReset, setShowReset] = useState(false);
  const [resetProgress, setResetProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);
  const [resetDone, setResetDone] = useState(false);

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<TransactionType>('expense');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export data
  const handleExport = useCallback(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        alert('Нет данных для экспорта');
        return;
      }
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `koshelek-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
      alert('Ошибка экспорта');
    }
  }, []);

  // Import data
  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        // Validate basic structure
        if (!parsed.transactions || !parsed.categories || !parsed.settings) {
          throw new Error('Invalid backup format');
        }

        localStorage.setItem(STORAGE_KEY, content);
        setImportStatus('success');
        
        // Reload after short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        console.error('Import failed', err);
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const HOLD_DURATION = 2500;

  const startHold = useCallback(() => {
    setIsHolding(true);
    holdStartRef.current = Date.now();

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      setResetProgress(progress);

      if (progress >= 1) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        setResetDone(true);
        resetAllData();
        setTimeout(() => {
          setShowReset(false);
          setResetDone(false);
          setResetProgress(0);
          setIsHolding(false);
        }, 1500);
      }
    }, 30);
  }, [resetAllData]);

  const endHold = useCallback(() => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    setIsHolding(false);
    if (!resetDone) {
      setResetProgress(0);
    }
  }, [resetDone]);

  const filteredCategories = categories.filter(c => c.type === categoryTypeFilter);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    addCategory({
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      type: categoryTypeFilter,
    });
    setNewCategoryName('');
    setNewCategoryIcon('📁');
    setShowAddCategory(false);
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !newCategoryName.trim()) return;
    updateCategory(editingCategory.id, {
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
    });
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryIcon('📁');
  };

  // no more fixed icon list — users type any emoji they want

  if (showCategoryManager) {
    return (
      <div className="absolute inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col">
        <div className="safe-top" />
        <div className="flex items-center gap-3 px-4 pt-1.5 pb-1.5 border-b border-gray-100 dark:border-gray-800">
          <button onClick={() => { setShowCategoryManager(false); setEditingCategory(null); setShowAddCategory(false); }} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Категории</h2>
          <div className="flex-1" />
          <button
            onClick={() => { setShowAddCategory(true); setEditingCategory(null); setNewCategoryName(''); setNewCategoryIcon('📁'); }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Type Filter */}
          <div className="mx-4 mt-4">
            <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1">
              <button
                onClick={() => setCategoryTypeFilter('expense')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  categoryTypeFilter === 'expense'
                    ? 'bg-white dark:bg-gray-800 text-red-500 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Расходы
              </button>
              <button
                onClick={() => setCategoryTypeFilter('income')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  categoryTypeFilter === 'income'
                    ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Доходы
              </button>
            </div>
          </div>

          {/* Add / Edit Category Form */}
          {(showAddCategory || editingCategory) && (
            <div className="mx-4 mt-4 p-4 bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {editingCategory ? 'Редактировать категорию' : 'Новая категория'}
              </h3>
              <div className="flex items-center gap-3 mb-4">
                {/* Emoji input */}
                <div className="relative">
                  <input
                    type="text"
                    value={newCategoryIcon}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') { setNewCategoryIcon('📁'); return; }
                      // Extract last emoji: use spread to split into graphemes
                      const chars = [...val];
                      setNewCategoryIcon(chars[chars.length - 1] || '📁');
                    }}
                    className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 text-center text-3xl outline-none cursor-pointer"
                    style={{ caretColor: 'transparent' }}
                  />
                  <span className="absolute -bottom-1 left-0 right-0 text-center text-[9px] text-gray-400">эмодзи</span>
                </div>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="Название"
                  className="flex-1 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200 outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddCategory(false); setEditingCategory(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400"
                >
                  Отмена
                </button>
                <button
                  onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    newCategoryName.trim()
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
                  }`}
                >
                  {editingCategory ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </div>
          )}

          {/* Category List */}
          <div className="mx-4 mt-4 mb-4">
            {filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Tag size={28} className="text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-400 dark:text-gray-500 text-sm">Нет категорий</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/50">
                {filteredCategories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{cat.name}</span>
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setNewCategoryName(cat.name);
                        setNewCategoryIcon(cat.icon);
                        setShowAddCategory(false);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col">
      <div className="safe-top" />
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-1.5 pb-1.5 border-b border-gray-100 dark:border-gray-800">
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Настройки</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Theme */}
        <div className="mx-4 mt-3">
          <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Оформление
          </h3>
          <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                {settings.theme === 'dark' ? (
                  <Moon size={18} className="text-indigo-400" />
                ) : (
                  <Sun size={18} className="text-amber-500" />
                )}
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {settings.theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
                </span>
              </div>
              <button
                onClick={() => setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
                className={`w-12 h-7 rounded-full relative transition-colors ${
                  settings.theme === 'dark' ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5.5 h-5.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${
                  settings.theme === 'dark' ? 'right-[3px]' : 'left-[3px]'
                }`} style={{ width: 22, height: 22 }} />
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mx-4 mt-5">
          <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Данные
          </h3>
          <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/50">
            <button
              onClick={() => setShowCategoryManager(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            >
              <div className="flex items-center gap-3">
                <Tag size={18} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Категории</span>
              </div>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
            </button>
          </div>
        </div>

        {/* Backup */}
        <div className="mx-4 mt-5">
          <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Резервная копия
          </h3>
          <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/50">
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            >
              <div className="flex items-center gap-3">
                <Download size={18} className="text-emerald-500" />
                <div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Экспорт данных</span>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Скачать JSON-файл</p>
                </div>
              </div>
            </button>

            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-full flex items-center justify-between px-4 py-3.5 text-left">
                <div className="flex items-center gap-3">
                  <Upload size={18} className="text-blue-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Импорт данных</span>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Загрузить из файла</p>
                  </div>
                </div>
              </div>
            </div>

            {importStatus === 'success' && (
              <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-2">
                <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400">Данные восстановлены! Перезагрузка...</span>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 flex items-center gap-2">
                <span className="text-sm text-red-500">Ошибка: неверный формат файла</span>
              </div>
            )}
          </div>
        </div>

        {/* About */}
        <div className="mx-4 mt-5">
          <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            О приложении
          </h3>
          <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/50">
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-gray-600 dark:text-gray-400">Версия</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">1.0.3</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-gray-600 dark:text-gray-400">Сборка</span>
              <span className="text-sm font-mono text-gray-400 dark:text-gray-500">2025.07.02</span>
            </div>
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-lg shadow-sm">
                  💰
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Кошелёк</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">Личные финансы, просто и уютно</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mx-4 mt-5 mb-6">
          <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Опасная зона
          </h3>
          <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-red-100 dark:border-red-900/30 overflow-hidden">
            {!showReset ? (
              <button
                onClick={() => setShowReset(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              >
                <Trash2 size={18} className="text-red-500" />
                <span className="text-sm font-medium text-red-500">Сбросить все данные</span>
              </button>
            ) : (
              <div className="p-4">
                {resetDone ? (
                  <div className="flex flex-col items-center py-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-2">
                      <Check size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Данные сброшены</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 text-center">
                      Удержите кнопку 2.5 сек для подтверждения
                    </p>
                    <button
                      onMouseDown={startHold}
                      onMouseUp={endHold}
                      onMouseLeave={endHold}
                      onTouchStart={startHold}
                      onTouchEnd={endHold}
                      className="w-full relative py-3 rounded-xl bg-red-500 text-white text-sm font-semibold overflow-hidden"
                    >
                      <div
                        className="absolute inset-0 bg-red-700 transition-none"
                        style={{ width: `${resetProgress * 100}%` }}
                      />
                      <span className="relative z-10">
                        {isHolding ? 'Удерживайте...' : 'Удерживайте для сброса'}
                      </span>
                    </button>
                    <button
                      onClick={() => { setShowReset(false); setResetProgress(0); }}
                      className="w-full mt-2 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400"
                    >
                      Отмена
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ size, className }: { size: number; className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
