import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LandingView } from './views/LandingView';
import { ViewState, Role, User, Team, Event, RSVPStatus, TeamMember, AuthStep, UserRoleOption, Transaction, TransactionType, PlayerStatus, Game } from './types';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './views/Dashboard';
import { CalendarView } from './views/CalendarView';
import { TeamView } from './views/TeamView';
import { EventDetailView } from './views/EventDetailView';
import { CreateEventView } from './views/CreateEventView';
import { LoginView } from './views/LoginView';
import { ProfileView } from './views/ProfileView';
import { FinanceView } from './views/FinanceView';
import { PrivacyView } from './views/PrivacyView';
import { TermsView } from './views/TermsView';
import { SupportView } from './views/SupportView';
import { PlayerProfileView } from './views/PlayerProfileView';
import { RSVPModal } from './components/RSVPModal';
import { Plus, Loader2 } from 'lucide-react';
import { api } from './api'; // Import API

const App: React.FC = () => {
  const navigate = useNavigate();
  const [authStep, setAuthStep] = useState<AuthStep>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [authBootstrapDone, setAuthBootstrapDone] = useState(false);
  
  // Data State
  const [user, setUser] = useState<User | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [calendarLink, setCalendarLink] = useState<string>('');
  
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');

  // Interaction State
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isRSVPModalOpen, setIsRSVPModalOpen] = useState(false);
  const [rsvpModalEvent, setRsvpModalEvent] = useState<Event | null>(null);

  const isTelegramMiniApp = () =>
    typeof window !== 'undefined' && Boolean((window as any).Telegram?.WebApp);

  // Initial Fetch
  const loadData = async (options?: { silent?: boolean }) => {
    setIsLoading(true);
    try {
        const data = await api.getInitData();

        if (data?.noTeamYet) {
          throw new Error('INIT_NO_TEAM');
        }
        if (data?.admin) {
          throw new Error('INIT_ADMIN_MODE');
        }
        if (!data?.user || !data?.team) {
          throw new Error('INIT_INVALID_SHAPE');
        }

        setUser(data.user);
        setActiveTeam(data.team);
        setEvents(data.events || []);
        setMembers(data.members || []);
        setTransactions(data.transactions || []);

        try {
          const [financeOverview, financeMembers] = await Promise.all([
            api.getFinanceOverview(data.team.id),
            api.getFinanceMembers(data.team.id),
          ]);

          if (financeOverview?.summary?.balance !== undefined) {
            setActiveTeam((prev) =>
              prev ? { ...prev, budget: Number(financeOverview.summary.balance) } : prev
            );
          }

          if (Array.isArray(financeMembers?.items)) {
            const financeByUserId = new Map<string, { outstanding: number; overpaid: number }>();
            for (const item of financeMembers.items) {
              financeByUserId.set(String(item.userId), {
                outstanding: Number(item.outstanding || 0),
                overpaid: Number(item.overpaid || 0),
              });
            }
            setMembers((prev) =>
              prev.map((m) => {
                const s = financeByUserId.get(m.id);
                if (!s) return m;
                return { ...m, balance: s.overpaid - s.outstanding };
              })
            );
          }

          if (Array.isArray(financeOverview?.recentTransactions) && financeOverview.recentTransactions.length > 0) {
            setTransactions(
              financeOverview.recentTransactions.map((t: any) => ({
                id: String(t.id),
                type: t.type as TransactionType,
                amount: Number(t.amount),
                title: String(t.title),
                date: new Date(t.date),
                userId: t.userId || undefined,
                userName: t.userName || undefined,
                status: (t.status as 'PENDING' | 'COMPLETED') || 'COMPLETED',
              }))
            );
          }
        } catch (financeErr) {
          console.warn('Finance bootstrap fallback to init payload', financeErr);
        }

        try {
          const ics = await api.getIcs(data.team.id);
          setCalendarLink(ics.url);
        } catch (icsErr) {
          console.warn('ICS bootstrap failed', icsErr);
          setCalendarLink('');
        }
        return true;
    } catch (e) {
        console.error("Error loading data", e);
        if (!options?.silent) {
          const message = e instanceof Error ? e.message : '';
          if (message.includes('INIT_NO_TEAM')) {
            alert('Вход выполнен, но вы пока не состоите ни в одной команде. Попросите капитана прислать инвайт.');
          } else if (message.includes('INIT_ADMIN_MODE')) {
            alert('Вход выполнен в админ-режиме. Этот экран пока не поддерживается в мобильном приложении.');
          } else {
            alert("Не удалось открыть приложение после входа. Проверьте авторизацию и попробуйте еще раз.");
          }
        }
        return false;
    } finally {
        setIsLoading(false);
    }
  };

  const tryEnterUserApp = async (options?: { silent?: boolean }) => {
    const ok = await loadData(options);
    if (ok) return true;

    try {
      const meRes = await fetch('/api/v1/auth/me', { credentials: 'include' });
      if (!meRes.ok) return false;
      const me = await meRes.json();
      if (!me?.authenticated) return false;

      if (me?.roleSelectionRequired || me?.accountRole === 'ADMIN') {
        const selectRes = await fetch('/api/v1/auth/select-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ accountRole: 'USER' }),
        });
        if (!selectRes.ok) return false;
        return await loadData(options);
      }
    } catch (error) {
      console.error('Failed to switch account role to USER', error);
    }

    return false;
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        let res = await fetch('/api/v1/auth/me', { credentials: 'include' });
        if (!res.ok) return;
        let payload = await res.json();

        if (!payload?.authenticated && isTelegramMiniApp()) {
          const initData = String((window as any).Telegram?.WebApp?.initData || '').trim();
          if (initData) {
            try {
              await api.authTelegramWebApp(initData);
              res = await fetch('/api/v1/auth/me', { credentials: 'include' });
              payload = res.ok ? await res.json() : payload;
            } catch (err) {
              console.warn('Telegram Mini App auto-auth failed', err);
            }
          }
        }

        if (!payload?.authenticated || cancelled) return;

        const ok = await tryEnterUserApp({ silent: true });
        if (cancelled) return;
        if (!ok) {
          setAuthStep('LOGIN');
          return;
        }

        setAuthStep('APP');

        const postAuthRequested = sessionStorage.getItem('pbth:post-auth-app') === '1';
        const shouldOpenApp =
          postAuthRequested ||
          isTelegramMiniApp();

        if (postAuthRequested) {
          sessionStorage.removeItem('pbth:post-auth-app');
        }

        if (shouldOpenApp) {
          navigate('/app', { replace: true });
        }
      } catch (error) {
        console.error('Failed to restore auth session', error);
      } finally {
        if (!cancelled) {
          setAuthBootstrapDone(true);
        }
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // --- AUTH HANDLERS ---
  const handleLogin = async () => {
    const ok = await tryEnterUserApp();
    if (ok) {
      sessionStorage.removeItem('pbth:post-auth-app');
      setAuthStep('APP');
      navigate('/app');
    }
  };

  const handleRoleSelect = (_option: UserRoleOption) => {
    // In real app, this would fetch context for that specific team
    handleLogin();
  };

  const handleLogout = () => {
    setAuthStep('LOGIN');
    setCurrentView('DASHBOARD');
    setUser(null);
    setActiveTeam(null);
    setSelectedMember(null);
    setSelectedEvent(null);
    setCalendarLink('');
    navigate('/');
  };

  const handleCopyIcsLink = async () => {
    if (!calendarLink) {
      alert('Ссылка календаря недоступна. Обновите профиль.');
      return;
    }
    try {
      await navigator.clipboard.writeText(calendarLink);
      alert('Ссылка скопирована');
    } catch (err) {
      console.error('Failed to copy ICS link', err);
      alert('Не удалось скопировать ссылку');
    }
  };

  const handleShareIcsLink = async () => {
    if (!calendarLink) {
      alert('Ссылка календаря недоступна. Обновите профиль.');
      return;
    }
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ url: calendarLink, title: 'PBTH calendar' });
      } else {
        await navigator.clipboard.writeText(calendarLink);
        alert('Ссылка скопирована');
      }
    } catch (err) {
      console.error('Failed to share ICS link', err);
    }
  };

  const handleDownloadIcs = async () => {
    if (!activeTeam) return;
    try {
      const ics = await api.getIcs(activeTeam.id);
      window.location.assign(ics.downloadUrl);
    } catch (err) {
      console.error('Failed to download ICS', err);
      alert('Не удалось скачать ICS');
    }
  };

  // --- FINANCE HANDLER ---
  const handleAddTransaction = async (t: Omit<Transaction, 'id' | 'date'>) => {
    if (!activeTeam) return;
    const newTx: Transaction = {
        id: `tx${Date.now()}`,
        date: new Date(),
        ...t
    };
    
    // Optimistic Update
    setTransactions(prev => [newTx, ...prev]);
    if (t.type === TransactionType.EXPENSE && activeTeam) {
        setActiveTeam(prev => prev ? ({ ...prev, budget: prev.budget - t.amount }) : null);
    } else if (t.type === TransactionType.DEPOSIT && activeTeam) {
        setActiveTeam(prev => prev ? ({ ...prev, budget: prev.budget + t.amount }) : null);
    }

    // Server Call
    if (t.type === TransactionType.DEPOSIT) {
      await api.createFinancePayment({
        teamId: activeTeam.id,
        amount: t.amount,
        title: t.title,
        payerUserId: t.userId,
        status: t.status,
      });
      return;
    }
    await api.addTransaction(newTx);
  };

  // --- APP HANDLERS ---
  const handleRsvp = async (id: string, status: RSVPStatus) => {
    if (!user) return;
    
    // Optimistic Update
    setEvents(prev => prev.map(e => {
        if (e.id === id) {
            // Update counts loosely
            const diff = status === RSVPStatus.CONFIRMED ? 1 : (e.rsvpStatus === RSVPStatus.CONFIRMED ? -1 : 0);
            return { ...e, rsvpStatus: status, attendeesCount: e.attendeesCount + diff };
        }
        return e;
    }));
    
    if (selectedEvent && selectedEvent.id === id) {
        setSelectedEvent(prev => prev ? ({...prev, rsvpStatus: status}) : null);
    }

    // Server Call
    await api.rsvp(id, user.id, status);
  };

  const handleCreateEvent = async (eventData: any) => {
    if (!activeTeam) return;

    const newEvent: Event = {
      id: `e${Date.now()}`,
      teamId: activeTeam.id,
      type: eventData.type,
      title: eventData.title,
      description: eventData.description,
      startDate: eventData.startDate,
      location: eventData.location,
      cost: eventData.cost,
      rsvpStatus: RSVPStatus.CONFIRMED,
      attendeesCount: 1,
      isConflict: false
    };

    // Optimistic
    setEvents(prev => [newEvent, ...prev].sort((a, b) => a.startDate.getTime() - b.startDate.getTime()));
    setCurrentView('DASHBOARD');

    // Server
    await api.createEvent(newEvent);
  };

  const handleEventClick = (event: Event) => setSelectedEvent(event);
  const handleEventLongPress = (event: Event) => {
    setRsvpModalEvent(event);
    setIsRSVPModalOpen(true);
  };

  const handleAddGame = async (eventId: string, game: Omit<Game, 'id'>) => {
    const createdGame: Game = {
      id: `g-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      time: game.time,
      opponent: game.opponent,
      score: game.score,
      pitZone: game.pitZone,
    };

    let nextScheduleForApi: Array<{ time: string; opponent: string; score?: string; pitZone?: 'NEAR' | 'FAR' }> = [];

    const applyAddGame = (sourceEvent: Event): Event => {
      const nextSchedule = [...(sourceEvent.schedule || []), createdGame].sort((a, b) =>
        a.time.localeCompare(b.time)
      );
      nextScheduleForApi = nextSchedule.map((item) => ({
        time: item.time,
        opponent: item.opponent,
        score: item.score,
        pitZone: item.pitZone,
      }));
      return { ...sourceEvent, schedule: nextSchedule };
    };

    setEvents((prev) =>
      prev.map((event) => (event.id === eventId ? applyAddGame(event) : event))
    );

    setSelectedEvent((prev) => {
      if (!prev || prev.id !== eventId) return prev;
      return applyAddGame(prev);
    });

    await api.updateEventSchedule(eventId, nextScheduleForApi);
  };

  const handleUpdateGame = async (
    eventId: string,
    gameId: string,
    patch: { time: string; opponent: string; score?: string; pitZone?: 'NEAR' | 'FAR' }
  ) => {
    let nextScheduleForApi: Array<{ time: string; opponent: string; score?: string; pitZone?: 'NEAR' | 'FAR' }> = [];

    const applyGamePatch = (sourceEvent: Event): Event => {
      const nextSchedule = (sourceEvent.schedule || []).map((game) =>
        game.id === gameId
          ? { ...game, time: patch.time, opponent: patch.opponent, score: patch.score, pitZone: patch.pitZone }
          : game
      );
      nextScheduleForApi = nextSchedule.map((game) => ({
        time: game.time,
        opponent: game.opponent,
        score: game.score,
        pitZone: game.pitZone,
      }));
      return { ...sourceEvent, schedule: nextSchedule };
    };

    setEvents((prev) =>
      prev.map((event) => (event.id === eventId ? applyGamePatch(event) : event))
    );

    setSelectedEvent((prev) => {
      if (!prev || prev.id !== eventId) return prev;
      return applyGamePatch(prev);
    });

    await api.updateEventSchedule(eventId, nextScheduleForApi);
  };

  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
  };

  const handleAttendeeClick = (
    userId: string,
    seed?: { name: string; nickname: string; avatar?: string; role?: 'CAPTAIN' | 'TRAINER' | 'PLAYER' }
  ) => {
    const fullMember = members.find((member) => member.id === userId);
    if (fullMember) {
      setSelectedMember(fullMember);
      return;
    }

    const preview = selectedEvent?.attendeePreview?.find((item) => item.userId === userId);
    const fallback = seed || (preview ? { name: preview.name, nickname: preview.nickname, avatar: preview.avatar } : undefined);
    if (!fallback) return;

    setSelectedMember({
      id: userId,
      name: fallback.name,
      nickname: fallback.nickname,
      avatar: fallback.avatar,
      role:
        fallback.role === 'CAPTAIN'
          ? Role.CAPTAIN
          : fallback.role === 'TRAINER'
            ? Role.TRAINER
            : Role.PLAYER,
      status: PlayerStatus.ACTIVE,
      balance: 0,
    });
  };

  const renderContent = () => {
    if (selectedMember) {
      return (
        <PlayerProfileView
          member={selectedMember}
          teamName={activeTeam!.name}
          onBack={() => setSelectedMember(null)}
        />
      );
    }

    if (selectedEvent) {
      return (
        <EventDetailView 
          event={selectedEvent} 
          currentUserRole={activeTeam!.role}
          onBack={() => setSelectedEvent(null)}
          onRsvp={handleRsvp}
          onAddGame={handleAddGame}
          onUpdateGame={handleUpdateGame}
          onAttendeeClick={handleAttendeeClick}
        />
      );
    }

    switch (currentView) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            user={user!}
            activeTeam={activeTeam!}
            events={events}
            onRsvp={handleRsvp}
            onEventClick={handleEventClick}
            onEventLongPress={handleEventLongPress}
          />
        );
      case 'CALENDAR':
        return (
          <CalendarView 
            events={events} 
            onEventClick={handleEventClick}
            onEventLongPress={handleEventLongPress}
          />
        );
      case 'FINANCE':
        return (
          <FinanceView 
            team={activeTeam!}
            transactions={transactions}
            members={members}
            currentUserRole={activeTeam!.role}
            onAddTransaction={handleAddTransaction}
          />
        );
      case 'TEAM':
        return (
          <TeamView 
            team={activeTeam!}
            members={members}
            currentUserRole={activeTeam!.role}
            onMemberClick={handleMemberClick}
          />
        );
      case 'PROFILE':
        return (
          <ProfileView 
            user={user!}
            onUpdateUser={() => {}}
            onLogout={handleLogout}
            calendarLink={calendarLink || 'Ссылка пока недоступна'}
            onCopyLink={handleCopyIcsLink}
            onShareLink={handleShareIcsLink}
            onDownloadICS={handleDownloadIcs}
          />
        );
      case 'CREATE':
        return (
            <CreateEventView 
              onBack={() => setCurrentView('DASHBOARD')}
              onCreate={handleCreateEvent}
            />
        );
      default:
        return <div>View not found</div>;
    }
  };

  const renderAppLayout = () => {
    if (!user || !activeTeam) {
      return (
        <div className="min-h-screen bg-pb-background flex items-center justify-center text-white px-6">
          <div className="text-center max-w-sm">
            <div className="text-xl font-bold mb-3">Данные команды недоступны</div>
            <p className="text-pb-subtext mb-6">
              Сессия активна, но профиль команды не загрузился. Попробуйте войти еще раз.
            </p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="bg-pb-primary text-pb-background px-5 py-3 rounded-xl font-bold"
            >
              Перейти ко входу
            </button>
          </div>
        </div>
      );
    }
    
    const isAdmin = activeTeam.role === Role.ADMIN || activeTeam.role === Role.CAPTAIN;

    return (
      <div className="min-h-screen bg-pb-background bg-splatter bg-fixed bg-no-repeat bg-center bg-cover text-white font-sans selection:bg-pb-primary selection:text-pb-background">
        <div className="fixed inset-0 bg-pb-background/72 -z-10 pointer-events-none"></div>

        <main className="max-w-md mx-auto min-h-screen relative shadow-2xl shadow-black overflow-hidden flex flex-col">
          <div className="flex-1">
               {renderContent()}
          </div>
          
          {isAdmin && !selectedEvent && !selectedMember && currentView !== 'CREATE' && (
              <div className="absolute bottom-24 right-4 z-50">
                  <button 
                    onClick={() => setCurrentView('CREATE')}
                    className="w-14 h-14 bg-pb-primary rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,230,118,0.5)] active:scale-95 transition-transform hover:bg-white text-pb-background"
                  >
                      <Plus size={32} strokeWidth={3} />
                  </button>
              </div>
          )}
        </main>

        <RSVPModal 
          event={rsvpModalEvent}
          isOpen={isRSVPModalOpen}
          onClose={() => setIsRSVPModalOpen(false)}
          onRsvp={handleRsvp}
        />

        {!selectedEvent && !selectedMember && currentView !== 'CREATE' && (
          <BottomNav 
            currentView={currentView}
            onChangeView={setCurrentView}
          />
        )}
      </div>
    );
  };

  if (isLoading) {
      return (
          <div className="min-h-screen bg-pb-background flex items-center justify-center text-white">
              <Loader2 className="animate-spin text-pb-primary" size={48} />
          </div>
      )
  }

  return (
    <Routes>
      <Route path="/" element={<LandingView />} />
      <Route path="/privacy" element={<PrivacyView />} />
      <Route path="/terms" element={<TermsView />} />
      <Route path="/support" element={<SupportView />} />
      <Route path="/login" element={
        authStep === 'APP'
          ? <Navigate to="/app" replace />
          : (
            <LoginView 
              onLogin={handleLogin}
              onSelectRole={handleRoleSelect}
              availableRoles={[{ teamId: 't1', teamName: 'Headshot Gladiators', role: Role.CAPTAIN }]}
            />
          )
      } />
      <Route
        path="/app/*"
        element={
          authStep === 'APP'
            ? renderAppLayout()
            : authBootstrapDone
              ? <Navigate to="/login" replace />
              : (
                <div className="min-h-screen bg-pb-background flex items-center justify-center text-white">
                  <Loader2 className="animate-spin text-pb-primary" size={48} />
                </div>
              )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
