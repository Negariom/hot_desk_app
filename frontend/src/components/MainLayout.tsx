import { NavLink, Outlet, useNavigate } from "react-router-dom"

import { clearAccessToken } from "../lib/auth"

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1 transition ${
    isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:text-slate-900"
  }`

export function MainLayout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAccessToken()
    navigate("/login", { replace: true })
  }

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between border-b border-white/60 bg-white/75 px-6 py-4 text-slate-900 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">Hot Desk</span>
          <span className="rounded-full bg-slate-900/5 px-2 py-1 text-xs font-medium text-slate-600">
            Admin tools
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <NavLink to="/" className={navLinkClass}>
            User view
          </NavLink>
          <NavLink to="/reservations" className={navLinkClass}>
            My reservations
          </NavLink>
          <NavLink to="/admin" className={navLinkClass}>
            Admin panel
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Logout
          </button>
        </div>
      </nav>

      <Outlet />
    </div>
  )
}
