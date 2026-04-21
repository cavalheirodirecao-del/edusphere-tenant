import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Crown, Users, BookOpen, TrendingUp, CheckCircle2, Award, BarChart3,
  Layers, ShieldCheck, Zap, Phone, ArrowRight, Star,
} from "lucide-react";

export default function Landing() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* NAVBAR */}
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold">
              Academia <span className="text-primary">Corporativa</span>
            </span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <button onClick={() => scrollTo("beneficios")} className="text-sm text-muted-foreground hover:text-white transition-colors">Benefícios</button>
            <button onClick={() => scrollTo("como-funciona")} className="text-sm text-muted-foreground hover:text-white transition-colors">Como funciona</button>
            <button onClick={() => scrollTo("planos")} className="text-sm text-muted-foreground hover:text-white transition-colors">Planos</button>
            <button onClick={() => scrollTo("contato")} className="text-sm text-muted-foreground hover:text-white transition-colors">Contato</button>
          </nav>
          <Link to="/login">
            <Button variant="outline" size="sm" className="border-primary/40 text-primary hover:bg-primary hover:text-white">
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
        </div>
        <div className="container text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Zap className="h-3.5 w-3.5" /> Treinamento profissional para sua equipe
          </div>
          <h1 className="font-display mx-auto max-w-3xl text-5xl font-bold leading-tight md:text-6xl">
            Eleve o padrão da sua <span className="text-primary glow-text">equipe de vendas</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Treine todos os seus funcionários com o mesmo conteúdo, acompanhe o progresso de cada um e garanta um atendimento padronizado em todas as suas lojas.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/setup">
              <Button variant="hero" size="lg" className="gap-2 px-8 text-base">
                Começar grátis <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <button onClick={() => scrollTo("planos")}>
              <Button variant="outline" size="lg" className="border-white/10 text-muted-foreground hover:text-white px-8 text-base">
                Ver planos
              </Button>
            </button>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Grátis até 3 funcionários</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Sem cartão de crédito</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Configuração em minutos</div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section id="beneficios" className="py-24">
        <div className="container">
          <div className="mb-16 text-center">
            <h2 className="font-display text-4xl font-bold">Por que treinar sua equipe?</h2>
            <p className="mt-4 text-muted-foreground">Empresas que investem em treinamento vendem mais e retêm mais clientes</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Atendimento padronizado",
                desc: "Todos os funcionários aprendem o mesmo processo, eliminando variações no atendimento entre lojas e turnos.",
              },
              {
                icon: TrendingUp,
                title: "Aumento nas vendas",
                desc: "Equipes bem treinadas convertem mais. Técnicas de vendas aplicadas de forma consistente geram resultados reais.",
              },
              {
                icon: BarChart3,
                title: "Acompanhamento em tempo real",
                desc: "Veja exatamente quem assistiu o quê, quanto tempo investiu e quais cursos estão sendo aproveitados.",
              },
              {
                icon: Layers,
                title: "Conteúdo organizado",
                desc: "Módulos, temas e aulas estruturados como uma faculdade. Seu conhecimento transformado em cursos completos.",
              },
              {
                icon: Award,
                title: "Certificados automáticos",
                desc: "Ao concluir os cursos, seus funcionários recebem certificados com sua assinatura e logo da empresa.",
              },
              {
                icon: Users,
                title: "Gestão por loja",
                desc: "Acompanhe o desempenho por unidade e saiba qual loja está mais engajada nos treinamentos.",
              },
            ].map((b) => (
              <div key={b.title} className="rounded-2xl border border-white/5 bg-white/3 p-6 transition-all hover:border-primary/30 hover:bg-primary/5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-24 bg-white/[0.02]">
        <div className="container">
          <div className="mb-16 text-center">
            <h2 className="font-display text-4xl font-bold">Como funciona</h2>
            <p className="mt-4 text-muted-foreground">Simples para você gerenciar, fácil para seus funcionários aprenderem</p>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: "1", title: "Cadastre sua empresa", desc: "Crie sua conta em minutos com CNPJ e dados básicos." },
              { step: "2", title: "Adicione seus cursos", desc: "Envie seus vídeos e organize em módulos e temas." },
              { step: "3", title: "Convide a equipe", desc: "Cadastre funcionários e defina quais cursos cada um acessa." },
              { step: "4", title: "Acompanhe o progresso", desc: "Veja relatórios, rankings e emita certificados." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-lg border border-primary/30">
                  {s.step}
                </div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-24">
        <div className="container">
          <div className="mb-16 text-center">
            <h2 className="font-display text-4xl font-bold">Planos e preços</h2>
            <p className="mt-4 text-muted-foreground">Comece grátis e expanda conforme sua equipe cresce</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {[
              {
                name: "Grátis",
                price: "R$ 0",
                period: "/mês",
                desc: "Para começar",
                limit: "Até 3 funcionários",
                features: ["Cursos ilimitados", "Player de vídeo", "Progresso por aluno", "Suporte por e-mail"],
                cta: "Começar grátis",
                highlight: false,
              },
              {
                name: "Starter",
                price: "R$ 50",
                period: "/mês",
                desc: "Equipes pequenas",
                limit: "De 4 a 7 funcionários",
                features: ["Tudo do Grátis", "Certificados", "Ranking por loja", "Relatórios"],
                cta: "Assinar",
                highlight: false,
              },
              {
                name: "Crescimento",
                price: "R$ 70",
                period: "/mês",
                desc: "Múltiplas lojas",
                limit: "De 8 a 15 funcionários",
                features: ["Tudo do Starter", "Múltiplas lojas", "Controle de acesso", "Quizzes"],
                cta: "Assinar",
                highlight: true,
              },
              {
                name: "Negócio",
                price: "R$ 99",
                period: "/mês",
                desc: "Operação completa",
                limit: "De 16 a 25 funcionários",
                features: ["Tudo do Crescimento", "Dashboard avançado", "Suporte prioritário", "Onboarding guiado"],
                cta: "Assinar",
                highlight: false,
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  p.highlight
                    ? "border-primary bg-primary/10 shadow-[0_0_40px_rgba(124,58,237,0.15)]"
                    : "border-white/10 bg-white/3"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
                      <Star className="h-3 w-3" /> Mais popular
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground">{p.name}</p>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="font-display text-3xl font-bold">{p.price}</span>
                    <span className="mb-1 text-sm text-muted-foreground">{p.period}</span>
                  </div>
                  <p className="mt-1 text-xs text-primary font-medium">{p.limit}</p>
                </div>
                <ul className="mb-6 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/setup">
                  <Button
                    className="w-full"
                    variant={p.highlight ? "hero" : "outline"}
                    size="sm"
                  >
                    {p.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* Plano Enterprise */}
          <div className="mt-8 mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/3 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-lg">Acima de 25 funcionários?</p>
              <p className="text-sm text-muted-foreground mt-1">Temos uma solução personalizada para operações maiores. Fale com a nossa equipe.</p>
            </div>
            <button onClick={() => scrollTo("contato")}>
              <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary hover:text-white shrink-0">
                <Phone className="h-4 w-4" /> Entrar em contato
              </Button>
            </button>
          </div>
        </div>
      </section>

      {/* CONTATO / CTA FINAL */}
      <section id="contato" className="py-24 bg-white/[0.02]">
        <div className="container text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-4xl font-bold">Pronto para começar?</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Crie sua conta grátis agora. Sem cartão de crédito, sem compromisso.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/setup">
                <Button variant="hero" size="lg" className="gap-2 px-10 text-base">
                  Cadastrar minha empresa <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="border-white/10 text-muted-foreground hover:text-white px-10 text-base">
                  Já tenho conta
                </Button>
              </Link>
            </div>
            <div className="mt-8 space-y-1 text-sm text-muted-foreground">
              <p>
                Dúvidas? Fale conosco:{" "}
                <a href="mailto:Wallysonfael@gmail.com" className="text-primary hover:underline">
                  Wallysonfael@gmail.com
                </a>
              </p>
              <p>
                WhatsApp:{" "}
                <a href="https://wa.me/5581998229477" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  (81) 99822-9477
                </a>
              </p>
              <p className="text-xs text-muted-foreground/60 mt-3">
                Wallyson Henrique Silva Rafael Oliveira · CNPJ 52.869.788/0001-70
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <Crown className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold">Academia Corporativa</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Academia Corporativa · CNPJ 52.869.788/0001-70</p>
          <Link to="/login" className="text-xs text-muted-foreground hover:text-primary">
            Acessar plataforma
          </Link>
        </div>
      </footer>
    </div>
  );
}
