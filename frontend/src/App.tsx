import { Navigate, Route, Routes } from "react-router-dom"
import "./App.css"
import { AdminFloorPlanPage } from "./pages/AdminFloorPlanPage"
import { FloorAvailabilityPage } from "./pages/FloorAvailabilityPage"
import { LoginPage } from "./pages/LoginPage"
import { MyReservationsPage } from "./pages/MyReservationsPage"
import { MainLayout } from "./components/MainLayout"
import { ProtectedRoute } from "./components/ProtectedRoute"

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<FloorAvailabilityPage />} />
          <Route path="/admin" element={<AdminFloorPlanPage />} />
          <Route path="/reservations" element={<MyReservationsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App