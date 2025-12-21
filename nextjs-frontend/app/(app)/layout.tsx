import { Sidebar } from "@/components/layout/sidebar"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row h-screen overflow-hidden bg-white">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white">
        {children}
      </main>
    </div>
  )
}
