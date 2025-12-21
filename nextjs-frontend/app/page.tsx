"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    // Redirect to login for now (can add auth check later)
    router.push("/login")
  }, [router])
  
  if (!mounted) {
    return null
  }
  
  return null
}

