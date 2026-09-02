import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserSettings, ElectionYear, Cargo } from '../types';
import { fetchElections, fetchCargos, fetchUserSettings, saveUserSettings, fetchMe } from '../services/api';

interface AppContextType {
  user: User | null;
  token: string | null;
  elections: ElectionYear[];
  cargos: Cargo[];
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedCargo: string;
  setSelectedCargo: (code: string) => void;
  selectedState: string;
  setSelectedState: (state: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  settings: UserSettings;
  updateSettings: (newSettings: UserSettings) => Promise<void>;
  login: (token: string, user: User) => void;
  logout: () => void;
  isInstallable: boolean;
  installPWA: () => void;
  loading: boolean;
  collapsedCargos: Record<string, boolean>;
  toggleCargoCollapse: (code: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('criterium_token'));
  const [elections, setElections] = useState<ElectionYear[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedCargo, setSelectedCargo] = useState<string>('ALL');
  const [selectedState, setSelectedStateState] = useState<string>(() => {
    return localStorage.getItem('criterium_selected_state') || 'ALL';
  });

  const setSelectedState = (state: string) => {
    setSelectedStateState(state);
    localStorage.setItem('criterium_selected_state', state);
    const updatedSettings = { ...settings, selectedState: state };
    setSettings(updatedSettings);
    if (token) {
      saveUserSettings(updatedSettings).catch(console.error);
    }
  };
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Persistent collapsed cargos state across navigation mounts/unmounts & browser reloads
  const [collapsedCargos, setCollapsedCargosState] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('criterium_collapsed_cargos');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const toggleCargoCollapse = (code: string) => {
    setCollapsedCargosState((prev) => {
      const next = { ...prev, [code]: !prev[code] };
      try {
        localStorage.setItem('criterium_collapsed_cargos', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const [settings, setSettings] = useState<UserSettings>({
    presetName: 'CUSTOM',
    autoRulesJson: '[]',
    selectedState: 'ALL',
    isGuest: true,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  // PWA Install Event listener
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const installPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          setIsInstallable(false);
        }
        setDeferredPrompt(null);
      });
    }
  };

  // Initial Load
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [electionsData, cargosData] = await Promise.all([fetchElections(), fetchCargos()]);
        setElections(electionsData);
        setCargos(cargosData);

        if (electionsData.length > 0) {
          setSelectedYear(electionsData[0].year);
        }

        if (token) {
          try {
            const userData = await fetchMe();
            setUser(userData);
          } catch {
            localStorage.removeItem('criterium_token');
            setToken(null);
          }
        }

        const settingsData = await fetchUserSettings();
        setSettings(settingsData);
        if (settingsData.selectedState) {
          setSelectedStateState(settingsData.selectedState);
          localStorage.setItem('criterium_selected_state', settingsData.selectedState);
        }
      } catch (err) {
        console.error('Error initializing app context:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token]);

  const updateSettings = async (newSettings: UserSettings) => {
    const saved = await saveUserSettings(newSettings);
    setSettings(saved);
    if (saved.selectedState) {
      setSelectedStateState(saved.selectedState);
      localStorage.setItem('criterium_selected_state', saved.selectedState);
    }
  };

  const login = async (newToken: string, newUser: User) => {
    localStorage.removeItem('criterium_guest_evaluations');
    localStorage.removeItem('criterium_guest_settings');
    localStorage.setItem('criterium_token', newToken);
    setToken(newToken);
    setUser(newUser);
    try {
      const userSettings = await fetchUserSettings();
      setSettings(userSettings);
      if (userSettings.selectedState) {
        setSelectedStateState(userSettings.selectedState);
        localStorage.setItem('criterium_selected_state', userSettings.selectedState);
      }
    } catch (e) {}
    window.dispatchEvent(new Event('criterium_rules_updated'));
  };

  const logout = () => {
    localStorage.removeItem('criterium_token');
    localStorage.removeItem('criterium_user_settings');
    localStorage.removeItem('criterium_guest_evaluations');
    localStorage.removeItem('criterium_guest_settings');
    setToken(null);
    setUser(null);
    setSelectedStateState('ALL');
    localStorage.setItem('criterium_selected_state', 'ALL');
    window.dispatchEvent(new Event('criterium_rules_updated'));
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        elections,
        cargos,
        selectedYear,
        setSelectedYear,
        selectedCargo,
        setSelectedCargo,
        selectedState,
        setSelectedState,
        searchQuery,
        setSearchQuery,
        settings,
        updateSettings,
        login,
        logout,
        isInstallable,
        installPWA,
        loading,
        collapsedCargos,
        toggleCargoCollapse,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
