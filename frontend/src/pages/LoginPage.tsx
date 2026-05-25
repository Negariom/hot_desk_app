import { type FormEvent, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "axios"

import { login } from "../api/client"
import { isAuthenticated, setAccessToken } from "../lib/auth"

type LocationState = {
  from?: {
    pathname: string
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = useMemo(() => {
    const state = location.state as LocationState | null
    return state?.from?.pathname ?? "/admin"
  }, [location.state])

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(redirectTo, { replace: true })
    }
  }, [navigate, redirectTo])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await login(email, password)
      setAccessToken(response.access_token)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail
        setError(typeof detail === "string" ? detail : "Invalid credentials.")
      } else {
        setError("Login failed. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl border border-white/80 bg-white/80 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur">
        <header className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Hot Desk
          </p>
          <h1 className="font-display text-3xl text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500">
            Use the seeded admin credentials to access the dashboard.
          </p>
        </header>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="password123"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          Seeded user: <span className="font-semibold">admin@example.com</span> / password123
        </div>
      </div>
    </div>
  )
}
