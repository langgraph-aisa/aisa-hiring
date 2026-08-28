import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ClipboardCheck, Database, LayoutDashboard, LockKeyhole, MessageCircle, Sparkles, UsersRound } from "lucide-react";
import { Link } from "wouter";

const emptyStats = { total: 0, enRevision: 0, calificados: 0, entrevistas: 0, positions: 0 };

export default function Home() {
  const { user, loading } = useAuth();
  const statsQuery = trpc.dashboard.summary.useQuery(undefined, { enabled: Boolean(user) });
  const stats = statsQuery.data ?? emptyStats;

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Cargando espacio de trabajo…</div>;

  if (!user) {
    return (
      <main className="min-h-screen overflow-hidden grid-paper">
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-10">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft"><Sparkles className="h-5 w-5" /></div>
              <div><p className="font-display text-lg font-800 tracking-tight">Talento Claro</p><p className="text-xs text-muted-foreground">Reclutamiento por evidencia</p></div>
            </div>
            <Button variant="outline" onClick={() => startLogin()} className="rounded-full px-5">Ingresar</Button>
          </header>
          <section className="grid gap-12 pb-20 pt-20 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:pt-28">
            <div>
              <Badge className="mb-6 rounded-full bg-accent text-accent-foreground hover:bg-accent">Operación más humana, decisiones más claras</Badge>
              <h1 className="max-w-2xl text-balance text-5xl font-800 leading-[1.02] tracking-[-0.06em] text-primary sm:text-7xl">Cada plaza merece una evaluación <span className="text-emerald-700">a su medida.</span></h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">Una consola para crear formularios, razonar respuestas, revisar candidatos y activar el siguiente paso sin perder el contexto.</p>
              <div className="mt-9 flex flex-wrap gap-3"><Button onClick={() => startLogin()} size="lg" className="rounded-full px-6">Entrar al panel <ArrowRight className="ml-2 h-4 w-4" /></Button><Link href="/apply/demo-vendedor"><Button variant="outline" size="lg" className="rounded-full px-6">Ver formulario de ejemplo</Button></Link></div>
              <div className="mt-12 flex flex-wrap gap-8 text-sm text-muted-foreground"><span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-emerald-700" /> Enlaces seguros por plaza</span><span className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-emerald-700" /> Reglas configurables</span></div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-emerald-100/60 blur-3xl" />
              <Card className="relative overflow-hidden rounded-[2rem] border-white/70 bg-primary text-primary-foreground shadow-lift">
                <CardHeader className="border-b border-white/10 pb-5"><div className="flex items-center justify-between"><div><p className="text-sm text-white/55">Vista del flujo</p><CardTitle className="mt-1 text-2xl text-white">Vendedor · Guatemala</CardTitle></div><span className="rounded-full bg-emerald-300/15 px-3 py-1 text-xs text-emerald-200">Publicado</span></div></CardHeader>
                <CardContent className="space-y-4 p-6"><div className="rounded-2xl bg-white/8 p-4"><div className="flex items-center justify-between text-sm"><span className="text-white/70">Preguntas completadas</span><span className="font-semibold">7 / 9</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[78%] rounded-full bg-emerald-300" /></div></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/8 p-4"><p className="text-xs text-white/55">Resultado</p><p className="mt-2 text-lg font-semibold text-emerald-200">En revisión</p></div><div className="rounded-2xl bg-white/8 p-4"><p className="text-xs text-white/55">Siguiente paso</p><p className="mt-2 text-lg font-semibold text-white">WhatsApp</p></div></div><div className="flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4"><MessageCircle className="h-5 w-5 text-emerald-200" /><p className="text-sm leading-5 text-white/80">La evaluación se guarda con trazabilidad y puede continuar cuando un reclutador confirma el avance.</p></div></CardContent>
              </Card>
            </div>
          </section>
          <section className="grid gap-4 border-t border-primary/10 py-10 sm:grid-cols-3"><Feature icon={LayoutDashboard} title="Una sola vista" text="Plazas, candidatos y reglas en un espacio ordenado." /><Feature icon={Database} title="Datos propios" text="PostgreSQL transaccional, sin hojas frágiles." /><Feature icon={UsersRound} title="Equipo alineado" text="Roles claros, auditoría y decisiones reversibles." /></section>
        </div>
      </main>
    );
  }

  const metrics = [{ label: "Postulaciones", value: stats.total, note: "Todas las plazas", icon: UsersRound, tone: "bg-sky-50 text-sky-700" }, { label: "En revisión", value: stats.enRevision, note: "Requieren atención", icon: ClipboardCheck, tone: "bg-amber-50 text-amber-700" }, { label: "Calificados", value: stats.calificados, note: "Listos para avanzar", icon: Sparkles, tone: "bg-emerald-50 text-emerald-700" }, { label: "Entrevistas", value: stats.entrevistas, note: "En cualquier estado", icon: MessageCircle, tone: "bg-violet-50 text-violet-700" }];
  return <div className="space-y-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-700">Centro de mando</p><h1 className="mt-2 text-4xl font-800 tracking-[-.04em] text-primary">Buenos días, {user.name?.split(" ")[0] ?? "equipo"}.</h1><p className="mt-2 text-muted-foreground">Una vista rápida de la operación de selección.</p></div><Link href="/admin/jobs"><Button className="rounded-full">Gestionar plazas <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(metric => <Card key={metric.label} className="rounded-3xl border-0 shadow-soft"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{metric.label}</p><p className="mt-3 text-4xl font-800 tracking-tight text-primary">{metric.value}</p><p className="mt-2 text-xs text-muted-foreground">{metric.note}</p></div><div className={`grid h-11 w-11 place-items-center rounded-2xl ${metric.tone}`}><metric.icon className="h-5 w-5" /></div></div></CardContent></Card>)}</div><div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><Card className="rounded-3xl border-0 shadow-soft"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-xl text-primary">Tu operación</CardTitle><p className="mt-1 text-sm text-muted-foreground">Atajos para las tareas más frecuentes.</p></div><Badge variant="outline" className="rounded-full">{stats.positions} plazas</Badge></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><Quick href="/admin/jobs" icon={LayoutDashboard} title="Configurar plazas" text="Publica enlaces seguros y asigna un agente." /><Quick href="/admin/candidates" icon={UsersRound} title="Revisar candidatos" text="Filtra estados y registra decisiones humanas." /><Quick href="/admin/reports" icon={Database} title="Ver informes" text="Convierte el flujo en señales accionables." /><Quick href="/admin/config" icon={MessageCircle} title="Integraciones" text="Administra receptores y variables de conexión." /></CardContent></Card><Card className="rounded-3xl border-0 bg-primary text-white shadow-soft"><CardHeader><CardTitle className="text-xl text-white">Principio operativo</CardTitle></CardHeader><CardContent><p className="text-3xl font-800 leading-tight">Reglas claras. Contexto completo. Siguiente paso oportuno.</p><p className="mt-5 text-sm leading-6 text-white/65">Los cambios humanos a “Calificado” se protegen con una ventana de 10 minutos antes de activar la continuación.</p></CardContent></Card></div></div>;
}

function Feature({ icon: Icon, title, text }: { icon: typeof LayoutDashboard; title: string; text: string }) { return <div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/8 text-primary"><Icon className="h-4 w-4" /></div><div><p className="font-semibold text-primary">{title}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{text}</p></div></div>; }
function Quick({ href, icon: Icon, title, text }: { href: string; icon: typeof LayoutDashboard; title: string; text: string }) { return <Link href={href}><div className="group flex gap-4 rounded-2xl border border-border/70 p-4 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/40"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="font-semibold text-primary group-hover:text-emerald-800">{title}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{text}</p></div></div></Link>; }
