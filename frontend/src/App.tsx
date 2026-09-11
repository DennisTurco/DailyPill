import { useEffect, useRef, useState } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import QuizPage from "./pages/QuizPage";
import TopicsPage from "./pages/TopicsPage";
import QuestionsPage from "./pages/QuestionsPage";
import InfoFactsPage from "./pages/InfoFactsPage";
import InfoFactPopupPage from "./pages/InfoFactPopupPage";
import QuizStartPopupPage from "./pages/QuizStartPopupPage";
import SettingsPage from "./pages/SettingsPage";
import { StatusBar } from "./components/StatusBar";
import { applyTheme, getStoredTheme, Theme } from "./lib/theme";
import {
  getStoredSidebarWidth,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  storeSidebarWidth,
} from "./lib/sidebarWidth";
import { getStoredSidebarCollapsed, storeSidebarCollapsed } from "./lib/sidebarCollapse";
import { hasSeenOnboarding, markOnboardingSeen, onOnboardingTrigger } from "./lib/onboarding";
import { OnboardingWizard } from "./components/OnboardingWizard";

const APP_VERSION = "1.0.0";
const SIDEBAR_COLLAPSED_WIDTH = 68;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<Theme>(getStoredTheme());

  const [sidebarWidth, setSidebarWidth] = useState(getStoredSidebarWidth());
  const [resizing, setResizing] = useState(false);
  const sidebarWidthRef = useRef(sidebarWidth);
  const [collapsed, setCollapsed] = useState(getStoredSidebarCollapsed());
  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding());

  useEffect(() => {
    window.dailyPill?.onNavigate((route) => navigate(route));
  }, [navigate]);

  useEffect(() => onOnboardingTrigger(() => setShowOnboarding(true)), []);

  function finishOnboarding() {
    markOnboardingSeen();
    setShowOnboarding(false);
  }

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    if (!resizing) return;

    function onMouseMove(e: MouseEvent) {
      const next = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, e.clientX));
      setSidebarWidth(next);
    }

    function onMouseUp() {
      setResizing(false);
      storeSidebarWidth(sidebarWidthRef.current);
    }

    document.body.classList.add("resizing-sidebar");
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      document.body.classList.remove("resizing-sidebar");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizing]);

  function resetSidebarWidth() {
    setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
    storeSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
  }

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    storeSidebarCollapsed(next);
  }

  if (location.pathname === "/popup/info-fact") {
    return <InfoFactPopupPage />;
  }

  if (location.pathname === "/popup/quiz-start") {
    return <QuizStartPopupPage />;
  }

  if (location.pathname === "/popup/quiz") {
    return (
      <div className="content popup-quiz-content">
        <QuizPage />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <nav
        className={`sidebar ${collapsed ? "collapsed" : ""}`}
        style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth }}
      >
        <div className="brand" title="DailyPill">
          <img src="/app-icon.png" alt="" width={24} height={24} />
          <span className="sidebar-label">DailyPill</span>
        </div>
        <NavLink to="/" end title="Dashboard"><i className="fa-solid fa-gauge-simple-high"/> <span className="sidebar-label">Dashboard</span></NavLink>
        <NavLink to="/quiz" title="Quiz"><i className="fa-solid fa-circle-play"/> <span className="sidebar-label">Quiz</span></NavLink>
        <NavLink to="/topics" title="Topics"><i className="fa-solid fa-layer-group"/> <span className="sidebar-label">Topics</span></NavLink>
        <NavLink to="/questions" title="Questions"><i className="fa-solid fa-circle-question"/> <span className="sidebar-label">Questions</span></NavLink>
        <NavLink to="/info-facts" title="Info facts"><i className="fa-solid fa-tablets"/> <span className="sidebar-label">Info facts</span></NavLink>
        <NavLink to="/settings" title="Settings"><i className="fa-solid fa-gear"/> <span className="sidebar-label">Settings</span></NavLink>

        <div style={{ flex: 1 }} />

        <div className="sidebar-version">v{APP_VERSION}</div>

        <button
          className="sidebar-action-btn"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <i className={`fa-solid ${collapsed ? "fa-angles-right" : "fa-angles-left"}`} />
          <span className="sidebar-label">{collapsed ? "Expand" : "Collapse"}</span>
        </button>

        <button className="sidebar-action-btn" onClick={toggleTheme} title={theme === "dark" ? "Light mode" : "Dark mode"}>
          <i className={theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon"} />
          <span className="sidebar-label">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
      </nav>
      {!collapsed && (
        <div
          className={`sidebar-resize-handle ${resizing ? "active" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setResizing(true);
          }}
          onDoubleClick={resetSidebarWidth}
          title="Drag to resize, double-click to reset"
        />
      )}
      <main className="content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/topics" element={<TopicsPage />} />
          <Route path="/questions" element={<QuestionsPage />} />
          <Route path="/info-facts" element={<InfoFactsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <StatusBar />
      {showOnboarding && <OnboardingWizard onFinish={finishOnboarding} />}
    </div>
  );
}
