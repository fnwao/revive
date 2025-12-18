// User state management
// Stores user info in localStorage for demo mode

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt: string
}

const STORAGE_KEY = "acquiri_user"

export function getUser(): User | null {
  if (typeof window === "undefined") return null
  
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }
  
  // Return default user if none exists
  const defaultUser: User = {
    id: "user-001",
    name: "Alex",
    email: "alex@example.com",
    createdAt: new Date().toISOString(),
  }
  
  saveUser(defaultUser)
  return defaultUser
}

export function saveUser(user: User): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    // Dispatch custom event for same-window updates
    window.dispatchEvent(new Event("userUpdated"))
  }
}

export function updateUser(updates: Partial<User>): User | null {
  const user = getUser()
  if (!user) return null
  
  const updated = { ...user, ...updates }
  saveUser(updated)
  return updated
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function getFirstName(name: string): string {
  return name.split(" ")[0] || name
}

