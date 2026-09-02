import { useEffect, useState } from "react";
import { Plus, Settings, WifiOff } from "lucide-react";
import { StoreProvider, useAppStore } from "./store/StoreContext";
import type { Transaction } from "./types";
import { AddTransactionScreen } from "./components/AddTransactionScreen";
import { AnalyticsScreen } from "./components/AnalyticsScreen";
import { DebtsScreen } from "./components/DebtsScreen";
import { HomeScreen } from "./components/HomeScreen";
import { SettingsScreen } from "./components/SettingsScreen";

type Tab = "home" | "analytics";
type Overlay = null | "add" | "edit" | "settings" | "debts";

function AppShell() {
  const { settings } = useAppStore();
  const [tab, setTab] = useState<Tab>("home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  // тема: классы .dark/.light, цвет статус-бара и фон за safe-area
  useEffect(() => {
    const dark = settings.theme === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    const meta = document.getElementById("meta-theme-color");
    meta?.setAttribute("content", dark ? "#0b0c10" : "#eceee8");
    document.body.style.backgroundColor = dark ? "#0b0c10" : "#eceee8";
    document.documentElement.style.backgroundColor = dark ? "#0b0c10" : "#eceee8";
  }, [settings.theme]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setOverlay("edit");
  };

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-bg">
      {/* ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="animate-orbit absolute -top-28 -left-20 h-72 w-72 rounded-full blur-[100px]" style={{ background: "var(--orb-1)" }} />
        <div className="absolute top-2/5 -right-28 h-64 w-64 rounded-full blur-[100px]" style={{ background: "var(--orb-2)" }} />
      </div>

      {/* header */}
      <header className="sticky top-0 z-30 bg-bg/75 pt-safe backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="glow-accent flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-on-accent">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
            </span>
            <p className="font-display text-[13px] font-semibold tracking-[0.28em] uppercase">
              Кошелёк
            </p>
          </div>
          {!online && (
            <span className="animate-pop flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent-ink">
              <WifiOff size={12} />
              Офлайн
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 px-5 pb-3.5">
          <div className="relative grid flex-1 grid-cols-2 rounded-full border border-line bg-surface p-1">
            <span
              className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-accent transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: tab === "analytics" ? "translateX(100%)" : "translateX(0)" }}
            />
            {(["home", "analytics"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative z-10 h-9 rounded-full text-[13px] font-bold transition-colors duration-300 ${
                  tab === t ? "text-on-accent" : "text-muted"
                }`}
              >
                {t === "home" ? "Главная" : "Аналитика"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOverlay("settings")}
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink"
            aria-label="Настройки"
          >
            <Settings size={18} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {/* content */}
      <main className="relative z-10 flex-1 px-5 pt-2">
        {tab === "home" ? (
          <HomeScreen key="home" onEdit={openEdit} onOpenDebts={() => setOverlay("debts")} />
        ) : (
          <AnalyticsScreen key="analytics" onEdit={openEdit} />
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => setOverlay("add")}
        className="press glow-accent fixed z-40 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-on-accent"
        style={{
          right: "max(1.25rem, calc(50% - 215px + 1.25rem))",
          bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        }}
        aria-label="Добавить операцию"
      >
        <Plus size={26} strokeWidth={3} />
      </button>

      {/* overlays */}
      {overlay === "add" && <AddTransactionScreen onClose={() => setOverlay(null)} />}
      {overlay === "edit" && editingTx && (
        <AddTransactionScreen
          initial={editingTx}
          onClose={() => {
            setOverlay(null);
            setEditingTx(null);
          }}
        />
      )}
      {overlay === "debts" && <DebtsScreen onClose={() => setOverlay(null)} />}
      {overlay === "settings" && <SettingsScreen onClose={() => setOverlay(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
