import { useState, useEffect } from 'react';
import { useStore } from './store';
import { ProceduralBackground } from './components/ProceduralBackground';
import { Onboarding } from './pages/Onboarding';
import { MainPage } from './pages/MainPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

type Page = 'main' | 'history' | 'settings';

function App() {
  const settings = useStore(state => state.settings);
  const [showOnboarding, setShowOnboarding] = useState(!settings.onboardingCompleted);
  const [currentPage, setCurrentPage] = useState<Page>('main');

  useEffect(() => {
    setShowOnboarding(!settings.onboardingCompleted);
  }, [settings.onboardingCompleted]);

  const renderPage = () => {
    if (showOnboarding) {
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
    </div>
  );
}

export default App;
