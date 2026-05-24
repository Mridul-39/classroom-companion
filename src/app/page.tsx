import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen, GraduationCap, Users, LayoutDashboard, Send, Clock, MessageSquare, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans text-zinc-900 selection:bg-zinc-200">
      <header className="px-6 py-4 flex items-center justify-between bg-white border-b border-zinc-200/60 sticky top-0 z-10 backdrop-blur-sm bg-white/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">Classroom Companion</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login?role=student" className={cn(buttonVariants({ variant: "ghost" }), "font-medium text-zinc-600 hover:text-zinc-900")}>
            Student Login
          </Link>
          <Link href="/login?role=teacher" className={cn(buttonVariants(), "bg-zinc-900 hover:bg-zinc-800 text-white font-medium shadow-sm")}>
            Teacher Login
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl space-y-8">
              <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-600 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-zinc-900 mr-2.5"></span>
                AI-powered Telegram classroom assistant
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 leading-[1.1]">
                Manage classroom assignments from Telegram.
              </h1>
              
              <p className="text-lg text-zinc-600 leading-relaxed max-w-xl">
                Teachers assign homework naturally through Telegram. Students receive updates, submit work, and track their progress in a clean, unified dashboard.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <Link href="/login?role=teacher" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto h-12 text-base px-8 gap-2 bg-zinc-900 hover:bg-zinc-800 text-white shadow-md")}>
                  <GraduationCap className="h-5 w-5" />
                  View Teacher Dashboard
                </Link>
                <Link href="/login?role=student" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "w-full sm:w-auto h-12 text-base px-8 gap-2 border-zinc-300 text-zinc-700 hover:bg-zinc-100")}>
                  <Users className="h-5 w-5" />
                  View Student Dashboard
                </Link>
              </div>
            </div>

            {/* Dashboard Mockup */}
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="rounded-2xl border border-zinc-200/60 bg-white p-2 shadow-2xl shadow-zinc-200/50">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 overflow-hidden flex h-[400px]">
                  {/* Mock Sidebar */}
                  <div className="w-16 sm:w-48 border-r border-zinc-200 bg-white p-4 hidden sm:flex flex-col gap-2">
                    <div className="h-4 w-24 bg-zinc-200 rounded mb-6"></div>
                    <div className="h-8 w-full bg-zinc-100 rounded-md"></div>
                    <div className="h-8 w-full bg-white rounded-md"></div>
                    <div className="h-8 w-full bg-white rounded-md"></div>
                  </div>
                  {/* Mock Main Area */}
                  <div className="flex-1 p-6 flex flex-col gap-4">
                    <div className="h-6 w-48 bg-zinc-200 rounded mb-4"></div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="h-20 bg-white border border-zinc-100 rounded-lg shadow-sm"></div>
                      <div className="h-20 bg-white border border-zinc-100 rounded-lg shadow-sm"></div>
                      <div className="h-20 bg-white border border-zinc-100 rounded-lg shadow-sm"></div>
                    </div>
                    <div className="flex-1 bg-white border border-zinc-100 rounded-lg shadow-sm p-4">
                      <div className="h-4 w-32 bg-zinc-100 rounded mb-4"></div>
                      <div className="space-y-3">
                        <div className="h-10 bg-zinc-50 rounded"></div>
                        <div className="h-10 bg-zinc-50 rounded"></div>
                        <div className="h-10 bg-zinc-50 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white border-t border-zinc-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-4">Everything you need to teach effectively</h2>
              <p className="text-zinc-600 text-lg">A unified platform that connects your chat app to a powerful tracking dashboard.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: "Natural Language", description: "Create assignments directly in Telegram using plain text.", icon: Send },
                { title: "Progress Tracking", description: "Monitor where every student is in their learning journey.", icon: LayoutDashboard },
                { title: "Smart Reminders", description: "Automated gentle nudges to keep students on schedule.", icon: Clock },
                { title: "Feedback History", description: "A structured timeline of all submissions and feedback.", icon: MessageSquare },
              ].map((feature, i) => (
                <div key={i} className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div className="h-10 w-10 bg-white border border-zinc-200 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-5 w-5 text-zinc-700" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-zinc-900 text-white">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold tracking-tight mb-16 text-center">How it works</h2>
            
            <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto relative">
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-zinc-800"></div>
              
              {[
                { step: "01", title: "Teacher assigns in Telegram", desc: "Just send a message to the bot. It automatically creates structured assignments." },
                { step: "02", title: "Student updates progress", desc: "Students receive notifications and can update their status directly from chat." },
                { step: "03", title: "Dashboard tracks everything", desc: "The web app provides a clean, unified view of all classroom activity." },
              ].map((item, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center text-center">
                  <div className="h-24 w-24 rounded-full bg-zinc-800 border-4 border-zinc-900 flex items-center justify-center mb-6">
                    <span className="text-2xl font-bold text-zinc-300">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 bg-white border-t border-zinc-200 text-center">
        <div className="flex items-center justify-center gap-2 mb-4 text-zinc-900 font-medium">
          <BookOpen className="h-5 w-5" />
          <span>Classroom Companion</span>
        </div>
        <p className="text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} Classroom Companion. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
