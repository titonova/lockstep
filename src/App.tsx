import { useState, useEffect } from 'react';
import { useStore } from './store';
import { ProceduralBackground } from './components/ProceduralBackground';
import { CurrentDateTime } from './components/CurrentDateTime';
import { Onboarding } from './pages/Onboarding';
import { MainPage } from './pages/MainPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';

type Page = 'main' | 'history' | 'settings';

function App() {
  const settings = useStore(state => state.settings);
  const [showLanding, setShowLanding] = useState(!settings.onboardingCompleted);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('main');

  useEffect(() => {
    if (settings.onboardingCompleted) {
      setShowLanding(false);
      setShowOnboarding(false);
    }
  }, [settings.onboardingCompleted]);

  // Show landing page for first-time visitors (no password set)
  if (showLanding && !settings.onboardingCompleted) {
    return (
      <LandingPage
        onGetStarted={() => {
          setShowLanding(false);
          setShowOnboarding(true);
        }}
      />
    );
  }

  const renderPage = () => {
    if (showOnboarding || !settings.onboardingCompleted) {
      return <Onboarding onComplete={() => setShowOnboarding(false)} />;
    }

    switch (currentPage) {
      case 'history':
        return <HistoryPage onBack={() => setCurrentPage('main')} />;
      case 'settings':
        return <SettingsPage onBack={() => setCurrentPage('main')} />;
      default:
        return <MainPage onNavigate={(page) => setCurrentPage(page)} />;
    }
  };

  return (
    <div className="min-h-screen">
      <ProceduralBackground intensity={settings.visualMode} />
      {renderPage()}
      <CurrentDateTime />
    </div>
  );
}

export default App;
