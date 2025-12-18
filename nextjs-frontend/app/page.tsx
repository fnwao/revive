import { redirect } from "next/navigation"

export default function Home() {
  // Redirect to login for now (can add auth check later)
  redirect("/login")
}

