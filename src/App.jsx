import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Vendas from "./pages/Vendas";
import PedidosVenda from "./pages/PedidosVenda";
import Produtos from "./pages/Produtos";
import Clientes from "./pages/Clientes";
import Relatorio from "./pages/Relatorio";
import OrdemServico from "./pages/OrdemServico";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white text-slate-900">
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/pedidos-venda" element={<PedidosVenda />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/relatorio" element={<Relatorio />} />
          <Route path="/ordem-servico" element={<OrdemServico />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}