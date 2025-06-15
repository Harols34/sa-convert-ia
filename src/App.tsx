
import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from "./context/AuthContext";
import { AccountProvider } from "./context/AccountContext";
import Login from "./pages/Login";
import Layout from "./components/layout/Layout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Calls from "./pages/Calls";
import Analytics from "./pages/Analytics";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import Accounts from "./pages/Accounts";
import CreateAccount from "./pages/CreateAccount";
import Users from "./pages/Users";
import CreateUser from "./pages/CreateUser";
import AssignUsers from "./pages/AssignUsers";
import Behaviors from "./pages/Behaviors";
import Prompts from "./pages/Prompts";
import PromptForm from "./pages/PromptForm";
import Tipificaciones from "./pages/Tipificaciones";
import Agents from "./pages/Agents";
import Workforce from "./pages/Workforce";
import Tools from "./pages/Tools";
import NotFound from "./pages/NotFound";
import { useAuth } from './context/AuthContext';
import Limits from "./pages/Limits";

const queryClient = new QueryClient();

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    // Redirect to login page
    window.location.href = `/login?redirect=${location.pathname}`;
    return null;
  }

  return children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AccountProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<AuthRoute><Layout /></AuthRoute>}>
                <Route index element={<Index />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="calls" element={<Calls />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="chat" element={<Chat />} />
                <Route path="settings" element={<Settings />} />
                <Route path="accounts" element={<Accounts />} />
                <Route path="create-account" element={<CreateAccount />} />
                <Route path="users" element={<Users />} />
                <Route path="create-user" element={<CreateUser />} />
                <Route path="assign-users" element={<AssignUsers />} />
                <Route path="behaviors" element={<Behaviors />} />
                <Route path="prompts" element={<Prompts />} />
                <Route path="prompt-form" element={<PromptForm />} />
                <Route path="tipificaciones" element={<Tipificaciones />} />
                <Route path="agents" element={<Agents />} />
                <Route path="workforce" element={<Workforce />} />
                <Route path="tools" element={<Tools />} />
                <Route path="limits" element={<Limits />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Router>
        </AccountProvider>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
