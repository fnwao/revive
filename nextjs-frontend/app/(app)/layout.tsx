import { Sidebar } from "@/components/layout/sidebar"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0F1115]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#0F1115]">
        {children}
      </main>
    </div>
  )
}
