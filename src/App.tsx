
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AccountProvider } from "@/context/AccountContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Analytics from "./pages/Analytics";
import Calls from "./pages/Calls";
import Users from "./pages/Users";
import Accounts from "./pages/Accounts";
import Settings from "./pages/Settings";
import Chat from "./pages/Chat";
import Behaviors from "./pages/Behaviors";
import Agents from "./pages/Agents";
import Workforce from "./pages/Workforce";
import Tools from "./pages/Tools";
import Tipificaciones from "./pages/Tipificaciones";
import Prompts from "./pages/Prompts";
import PromptForm from "./pages/PromptForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <AccountProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/calls/*" element={<Calls />} />
                <Route path="/users/*" element={<Users />} />
                <Route path="/accounts/*" element={<Accounts />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/chat/*" element={<Chat />} />
                <Route path="/behaviors/*" element={<Behaviors />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/workforce" element={<Workforce />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/tipificaciones" element={<Tipificaciones />} />
                <Route path="/prompts" element={<Prompts />} />
                <Route path="/prompts/new" element={<PromptForm />} />
                <Route path="/prompts/edit/:id" element={<PromptForm />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AccountProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
