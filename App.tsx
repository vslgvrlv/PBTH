import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LandingView } from './views/LandingView';
import { ViewState, Role, User, Team, Event, EventType, RSVPStatus, TeamMember, PlayerStatus, Game, AuthStep, UserRoleOption, Transaction, TransactionType } from './types';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './views/Dashboard';
import { CalendarView } from './views/CalendarView';
import { TeamView } from './views/TeamView';
import { EventDetailView } from './views/EventDetailView';
import { CreateEventView } from './views/CreateEventView';
import { LoginView } from './views/LoginView';
import { ProfileView } from './views/ProfileView';
import { FinanceView } from './views/FinanceView';
import { RSVPModal } from './components/RSVPModal';
import { Terminal, Plus, Loader2 } from 'lucide-react';
import { api } from './api'; // Import API

const App: React.FC = () => {
  const navigate = useNavigate();
  const [authStep, setAuthStep] = useState<AuthStep>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data State
  const [user, setUser] = useState<User | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');

  // Interaction State
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isRSVPModalOpen, setIsRSVPModalOpen] = useState(false);
  const [rsvpModalEvent, setRsvpModalEvent] = useState<Event | null>(null);

  // Initial Fetch
  const loadData = async () => {
    setIsLoading(true);
    try {
        const data = await api.getInitData('u1'); // Hardcoded ID for MVP
        setUser(data.user);
        setActiveTeam(data.team);
        setEvents(data.events);
        setMembers(data.members);
        setTransactions(data.transactions);
    } catch (e) {
        console.error("Error loading data", e);
        // Fallback for demo if server offline
        alert("Ошибка подключения к серверу. Убедитесь, что сервер запущен (node server/index.js)");
    } finally {
        setIsLoading(false);
    }
  };

  // --- AUTH HANDLERS ---
  const handleLogin = () => {
    loadData().then(() => {
      setAuthStep('APP');
      navigate('/app');
    });
  };

  const handleRoleSelect = (option: UserRoleOption) => {
    // In real app, this would fetch context for that specific team
    handleLogin();
  };

  const handleLogout = () => {
    setAuthStep('LOGIN');
    setCurrentView('DASHBOARD');
    setUser(null);
    navigate('/');
  };

  // --- FINANCE HANDLER ---
  const handleAddTransaction = async (t: Omit<Transaction, 'id' | 'date'>) => {
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

  const renderContent = () => {
    if (selectedEvent) {
      return (
        <EventDetailView 
          event={selectedEvent} 
          currentUserRole={activeTeam!.role}
          onBack={() => setSelectedEvent(null)}
          onRsvp={handleRsvp}
          onAddGame={() => {}} // Not implemented in MVP backend yet
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
          />
        );
      case 'PROFILE':
        return (
          <ProfileView 
            user={user!}
            onUpdateUser={() => {}}
            onLogout={handleLogout}
            calendarLink="#"
            onCopyLink={() => {}}
            onShareLink={() => {}}
            onDownloadICS={() => {}}
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
    if (!user || !activeTeam) return null;
    
    const isAdmin = activeTeam.role === Role.ADMIN || activeTeam.role === Role.CAPTAIN;

    return (
      <div className="min-h-screen bg-pb-background bg-splatter bg-fixed bg-no-repeat bg-center bg-cover text-white font-sans selection:bg-pb-primary selection:text-pb-background">
        <div className="fixed inset-0 bg-pb-background/90 -z-10 pointer-events-none"></div>

        <main className="max-w-md mx-auto min-h-screen relative shadow-2xl shadow-black overflow-hidden flex flex-col">
          <div className="flex-1">
               {renderContent()}
          </div>
          
          {isAdmin && !selectedEvent && currentView !== 'CREATE' && (
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

        {!selectedEvent && currentView !== 'CREATE' && (
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
      <Route path="/login" element={
        <LoginView 
            onLogin={handleLogin}
            onSelectRole={handleRoleSelect}
            availableRoles={[{ teamId: 't1', teamName: 'Headshot Gladiators', role: Role.CAPTAIN }]}
        />
      } />
      <Route path="/app/*" element={
        (authStep === 'APP' && user && activeTeam) ? renderAppLayout() : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;