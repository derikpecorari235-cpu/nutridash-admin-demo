import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Pacientes from "@/pages/Pacientes";
import Financeiro from "@/pages/Financeiro";
import Conteudo from "@/pages/Conteudo";
import NotFound from "@/pages/NotFound";

const App = () => (
  <AuthProvider>
    <Sonner theme="dark" />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/leads" element={<Leads />} />
          <Route path="/dashboard/pacientes" element={<Pacientes />} />
          <Route path="/dashboard/financeiro" element={<Financeiro />} />
          <Route path="/dashboard/conteudo" element={<Conteudo />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
