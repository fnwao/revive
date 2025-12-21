"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to login for now (can add auth check later)
    router.push("/login")
  }, [router])
  
  return null
}

