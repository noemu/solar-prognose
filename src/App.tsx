import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { PlantEditorPage } from "./pages/PlantEditorPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/anlage/neue-anlage" element={<PlantEditorPage />} />
      <Route path="/anlage/:plantId" element={<PlantEditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
