import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { RidePage } from "./pages/RidePage";
import { CostPage } from "./pages/CostPage";
import { StatsPage } from "./pages/StatsPage";
import { SettlePage } from "./pages/SettlePage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/ride" element={<RidePage />} />
          <Route path="/cost" element={<CostPage />} />
          <Route path="/stats/:userId" element={<StatsPage />} />
          <Route path="/settle" element={<SettlePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
