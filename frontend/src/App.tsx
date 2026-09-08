import { useEffect } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import QuizPage from "./pages/QuizPage";
import TopicsPage from "./pages/TopicsPage";
import QuestionsPage from "./pages/QuestionsPage";
import InfoFactsPage from "./pages/InfoFactsPage";
import InfoFactPopupPage from "./pages/InfoFactPopupPage";
import SettingsPage from "./pages/SettingsPage";
import { StatusBar } from "./components/StatusBar";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.dailyPill?.onNavigate((route) => navigate(route));
  }, [navigate]);

  if (location.pathname === "/popup/info-fact") {
    return <InfoFactPopupPage />;
  }

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="brand">
          <img src="/app-icon.png" alt="" width={24} height={24} />
          DailyPill
        </div>
        <NavLink to="/" end><i className="fa-solid fa-gauge-simple-high"/> Dashboard</NavLink>
        <NavLink to="/quiz"><i className="fa-solid fa-circle-play"/> Quiz</NavLink>
        <NavLink to="/topics"><i className="fa-solid fa-layer-group"/> Topics</NavLink>
        <NavLink to="/questions"><i className="fa-solid fa-circle-question"/> Questions</NavLink>
        <NavLink to="/info-facts"><i className="fa-solid fa-tablets"/> Info facts</NavLink>
        <NavLink to="/settings"><i className="fa-solid fa-gear"/> Settings</NavLink>
      </nav>
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
    </div>
  );
}
