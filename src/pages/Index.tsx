import CortanaChat from "@/components/CortanaChat";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(190 100% 50%) 1px, transparent 1px), linear-gradient(90deg, hsl(190 100% 50%) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Center content */}
      <div className="relative z-10 text-center space-y-4">
        <h1 className="font-display text-4xl md:text-6xl font-bold text-primary tracking-wider">
          UNSC INFINITY
        </h1>
        <p className="text-muted-foreground text-lg tracking-widest uppercase">
          Sistema de Inteligencia Artificial Táctico
        </p>
        <p className="text-sm text-muted-foreground/60 mt-8">
          Haga clic en cualquier lugar para iniciar protocolo
        </p>
      </div>

      <CortanaChat />
    </div>
  );
};

export default Index;
