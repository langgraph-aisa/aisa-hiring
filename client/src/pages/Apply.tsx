import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, ChevronRight, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";

const demoForm = {
  title: "Vendedor de campo",
  department: "Comercial",
  locationLabel: "Ciudad de Guatemala · Modalidad presencial",
  description: "Buscamos una persona cercana, organizada y con energía para acompañar a nuestros clientes.",
  form: { title: "Cuéntanos sobre ti", intro: "Completar este formulario toma menos de 3 minutos. Tus respuestas se usarán únicamente para esta plaza." },
  questions: [
    { id: 1, fieldKey: "vehicle", label: "¿Tienes licencia vigente y puedes conducir vehículo mecánico?", helpText: "Esta es una condición esencial para la plaza.", type: "select", required: true, answerConfig: { options: ["Sí", "No"] } },
    { id: 2, fieldKey: "experience", label: "¿Cuánto tiempo de experiencia tienes en ventas?", helpText: "Indica el tiempo total, aunque sea en diferentes empresas.", type: "text", required: true, answerConfig: {} },
    { id: 3, fieldKey: "location", label: "¿En qué municipio resides?", helpText: "Selecciona la opción que mejor describa tu residencia.", type: "select", required: true, answerConfig: { options: ["Guatemala", "Mixco", "Villa Nueva", "Amatitlán", "Otro"] } },
    { id: 4, fieldKey: "motivation", label: "¿Qué te interesa de esta oportunidad?", helpText: "Cuéntanoslo con tus propias palabras.", type: "textarea", required: true, answerConfig: {} },
  ],
};

export default function Apply() {
  const [, params] = useRoute("/apply/:token");
  const token = params?.token ?? "demo-vendedor";
  const isDemo = token === "demo-vendedor";
  const formQuery = trpc.publicJobs.getByToken.useQuery({ token }, { enabled: !isDemo });
  const submitMutation = trpc.publicJobs.submit.useMutation();
  const form = (isDemo ? demoForm : formQuery.data) as typeof demoForm | null;
  const [step, setStep] = useState<"intro" | "form" | "success">("intro");
  const [values, setValues] = useState<Record<string, string>>({});
  const [contact, setContact] = useState({ fullName: "", phone: "", email: "" });
  const [error, setError] = useState("");

  const questions = useMemo(() => form?.questions ?? [], [form]);
  const update = (key: string, value: string) => setValues(current => ({ ...current, [key]: value }));
  const send = async () => {
    setError("");
    if (!contact.fullName.trim() || !contact.phone.trim()) { setError("Escribe tu nombre y teléfono para continuar."); return; }
    const missing = questions.find(question => question.required && !String(values[question.fieldKey] ?? "").trim());
    if (missing) { setError(`Completa la pregunta: ${missing.label}`); return; }
    if (isDemo) { setStep("success"); return; }
    try {
      const result = await submitMutation.mutateAsync({ token, ...contact, answers: values });
      if (result.alreadyApplied) { setError(result.message); return; }
      setStep("success");
    } catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : "No pudimos enviar tu solicitud. Intenta nuevamente."); }
  };

  if (!form && formQuery.isLoading) return <Loading />;
  if (!form) return <main className="grid min-h-screen place-items-center bg-[#f7f4ed] p-6"><Card className="max-w-md rounded-3xl border-0 p-4 shadow-soft"><CardContent className="pt-6 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-700"><ShieldCheck className="h-6 w-6" /></div><h1 className="mt-5 text-2xl font-800 text-primary">Este enlace ya no está disponible</h1><p className="mt-3 text-muted-foreground">La plaza pudo haber sido cerrada o el enlace no es válido.</p></CardContent></Card></main>;

  return <main className="min-h-screen bg-[#f7f4ed] px-4 py-5 sm:px-6 sm:py-10"><div className="mx-auto max-w-2xl"><header className="mb-8 flex items-center justify-between"><Link href="/"><span className="flex items-center gap-2 text-sm font-semibold text-primary"><div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></div>Talento Claro</span></Link><span className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Postulación segura</span></header>{step === "intro" && <Card className="overflow-hidden rounded-[2rem] border-0 shadow-lift"><div className="bg-primary p-7 text-white sm:p-10"><p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-200">Plaza disponible</p><h1 className="mt-3 text-4xl font-800 tracking-[-.05em] sm:text-5xl">{form.title}</h1><div className="mt-5 flex flex-wrap gap-4 text-sm text-white/70"><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-300" />{form.locationLabel ?? form.department ?? "Guatemala"}</span><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" />Enlace verificado</span></div></div><CardContent className="p-7 sm:p-10"><h2 className="text-xl font-800 text-primary">Antes de comenzar</h2><p className="mt-3 leading-7 text-muted-foreground">{form.description}</p><div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><strong>Esta aplicación corresponde a:</strong> {form.title}. Al enviarla, quedará registrada para esta plaza y no será necesario repetirla.</div><Button onClick={() => setStep("form")} size="lg" className="mt-8 w-full rounded-2xl">Comenzar formulario <ChevronRight className="ml-2 h-4 w-4" /></Button></CardContent></Card>}{step === "form" && <Card className="rounded-[2rem] border-0 shadow-soft"><CardHeader className="p-7 pb-4 sm:p-10 sm:pb-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-700">Paso único · {form.title}</p><CardTitle className="mt-3 text-3xl font-800 tracking-[-.04em] text-primary">{form.form.title}</CardTitle><p className="mt-2 text-sm leading-6 text-muted-foreground">{form.form.intro}</p></div><div className="hidden rounded-2xl bg-secondary p-3 text-secondary-foreground sm:block"><ClipboardIcon /></div></div></CardHeader><CardContent className="space-y-7 p-7 pt-4 sm:p-10 sm:pt-5"><div className="grid gap-5 border-b border-border/70 pb-7 sm:grid-cols-2"><Field label="Nombre completo" required><Input value={contact.fullName} onChange={event => setContact({ ...contact, fullName: event.target.value })} placeholder="Tu nombre y apellidos" /></Field><Field label="Teléfono móvil" required><div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-10" value={contact.phone} onChange={event => setContact({ ...contact, phone: event.target.value })} placeholder="+502 5555 5555" inputMode="tel" /></div></Field></div><Field label="Correo electrónico"><Input value={contact.email} onChange={event => setContact({ ...contact, email: event.target.value })} placeholder="tu@correo.com" type="email" /></Field>{questions.map(question => <Field key={question.fieldKey} label={question.label} required={question.required} help={question.helpText}>{question.type === "textarea" ? <Textarea value={values[question.fieldKey] ?? ""} onChange={event => update(question.fieldKey, event.target.value)} placeholder="Escribe tu respuesta" rows={4} /> : question.type === "select" ? <select className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={values[question.fieldKey] ?? ""} onChange={event => update(question.fieldKey, event.target.value)}><option value="">Selecciona una opción</option>{((question.answerConfig as { options?: string[] })?.options ?? []).map(option => <option key={option} value={option}>{option}</option>)}</select> : <Input value={values[question.fieldKey] ?? ""} onChange={event => update(question.fieldKey, event.target.value)} placeholder="Escribe tu respuesta" />}</Field>)}{error && <div className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800">{error}</div>}<Button onClick={send} disabled={submitMutation.isPending} size="lg" className="w-full rounded-2xl">{submitMutation.isPending ? "Enviando…" : "Enviar formulario"}</Button><p className="text-center text-xs leading-5 text-muted-foreground">Al enviar confirmas que la información es tuya y autorizas su uso para este proceso de selección.</p></CardContent></Card>}{step === "success" && <Card className="rounded-[2rem] border-0 shadow-lift"><CardContent className="p-8 text-center sm:p-12"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-8 w-8" /></div><h1 className="mt-6 text-3xl font-800 tracking-[-.04em] text-primary">Tu aplicación fue enviada</h1><p className="mx-auto mt-4 max-w-md leading-7 text-muted-foreground">Gracias por aplicar a la plaza de {form.title}. Revisaremos tus respuestas y te contactaremos por WhatsApp si avanzas a la siguiente fase.</p><div className="mt-8 rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">Conserva tu teléfono disponible. No necesitas volver a llenar este formulario.</div></CardContent></Card>}</div></main>;
}
function Field({ label, required, help, children }: { label: string; required?: boolean; help?: string | null; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-sm font-semibold text-primary">{label}{required && <span className="ml-1 text-emerald-700">*</span>}</Label>{help && <p className="text-xs leading-5 text-muted-foreground">{help}</p>}{children}</div>; }
function Loading() { return <main className="grid min-h-screen place-items-center bg-[#f7f4ed] p-6"><div className="text-center"><div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-primary/15" /><p className="mt-4 text-sm text-muted-foreground">Cargando formulario…</p></div></main>; }
function ClipboardIcon() { return <div className="h-5 w-5 rounded border-2 border-current"><div className="mx-auto -mt-1 h-1.5 w-2/3 rounded bg-secondary" /></div>; }
