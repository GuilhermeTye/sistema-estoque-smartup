import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ModuleRoute from "./components/ModuleRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PedidosVenda from "./pages/PedidosVenda";
import Produtos from "./pages/Produtos";
import Clientes from "./pages/Clientes";
import Relatorio from "./pages/Relatorio";
import OrdemServico from "./pages/OrdemServico";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-white text-slate-900">
                <Navbar />

                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/home" element={<Navigate to="/" replace />} />

                  <Route
                    path="/dashboard"
                    element={
                      <ModuleRoute modulo="modulo_dashboard">
                        <Dashboard />
                      </ModuleRoute>
                    }
                  />

                  <Route
                    path="/pedidos-venda"
                    element={
                      <ModuleRoute modulo="modulo_pedidos">
                        <PedidosVenda />
                      </ModuleRoute>
                    }
                  />

                  <Route
                    path="/produtos"
                    element={
                      <ModuleRoute modulo="modulo_produtos">
                        <Produtos />
                      </ModuleRoute>
                    }
                  />

                  <Route
                    path="/clientes"
                    element={
                      <ModuleRoute modulo="modulo_clientes">
                        <Clientes />
                      </ModuleRoute>
                    }
                  />

                  <Route
                    path="/relatorio"
                    element={
                      <ModuleRoute modulo="modulo_relatorio">
                        <Relatorio />
                      </ModuleRoute>
                    }
                  />

                  <Route
                    path="/ordem-servico"
                    element={
                      <ModuleRoute modulo="modulo_os">
                        <OrdemServico />
                      </ModuleRoute>
                    }
                  />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}