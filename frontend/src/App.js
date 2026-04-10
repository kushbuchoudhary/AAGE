import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SocketProvider } from './hooks/useSocket';
import LoginPage from './components/UI/LoginPage';
import Dashboard from './components/Dashboard/Dashboard';
import GameLobby from './components/Games/GameLobby';
import GameSession from './components/GameEngine/GameSession';
import Analytics from './components/Dashboard/Analytics';
import Leaderboard from './components/Dashboard/Leaderboard';
import AdminPanel from './components/Admin/AdminPanel';
import Layout from './components/UI/Layout';
import './styles.css';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" />;
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="games" element={<GameLobby />} />
              <Route path="game/:gameId" element={<GameSession />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
