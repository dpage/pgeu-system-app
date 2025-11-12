import { useEffect } from 'react';
import { IonApp, setupIonicReact } from '@ionic/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* ML Kit Scanner CSS */
import './scanner.css';

import { useConferenceStore } from './store/conferenceStore';
import { useDeepLink } from './hooks/useDeepLink';
import ConferenceListPage from './pages/ConferenceListPage';
import AddConferencePage from './pages/AddConferencePage';
import StatsPage from './pages/StatsPage';

setupIonicReact();

const AppContent: React.FC = () => {
  const initialize = useConferenceStore(state => state.initialize);

  // Initialize deep linking
  useDeepLink({
    navigateOnSuccess: true,
    checkLaunchUrl: true,
  });

  // Initialize the conference store when app starts
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/conferences" replace />} />
      <Route path="/conferences" element={<ConferenceListPage />} />
      <Route path="/conferences/add" element={<AddConferencePage />} />
      <Route path="/stats" element={<StatsPage />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <IonApp>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </IonApp>
  );
};

export default App;
