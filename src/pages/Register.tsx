import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/app/dashboard");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left */}
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-border/40 scanline-bg">
        <span className="font-mono-label text-muted-foreground">Elite Verhandlungs-System // V.6.0</span>
        <div>
          <p className="font-mono-label text-primary mb-6">Sovereign Intelligence</p>
          <h1 className="font-serif italic text-primary text-7xl xl:text-8xl font-semibold tracking-tight mb-10">
            STRATEGOS
          </h1>
          <p className="font-serif text-2xl leading-snug max-w-md text-foreground/90">
            The absolute terminal for high-stakes negotiation analysis and strategic execution. Secure your seat at the table.
          </p>
          <div className="flex items-center gap-4 mt-10">
            <span className="w-16 h-px bg-primary" />
            <span className="font-mono-label text-primary">Est. MMXXIV</span>
          </div>
        </div>
        <span className="font-mono-label text-muted-foreground">◆ Secure_Server_A12 — Timestamp: 12:44:01 GMT</span>
      </div>

      {/* Right */}
      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <h1 className="font-serif text-5xl mb-2">Create Account</h1>
          <p className="font-serif italic text-muted-foreground mb-10">Initialize your sovereign profile</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="font-mono-label text-muted-foreground mb-2 block">Full Name</label>
              <input type="text" placeholder="E.g. Alexander von Clausewitz"
                className="w-full bg-transparent border-0 border-b border-border/60 focus:border-primary focus:outline-none py-2 font-serif text-lg placeholder:text-muted-foreground/40" />
            </div>
            <div>
              <label className="font-mono-label text-muted-foreground mb-2 block">Email Address</label>
              <input type="email" placeholder="name@organization.com"
                className="w-full bg-transparent border-0 border-b border-border/60 focus:border-primary focus:outline-none py-2 font-serif text-lg placeholder:text-muted-foreground/40" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="font-mono-label text-muted-foreground mb-2 block">Password</label>
                <input type="password" placeholder="••••••••"
                  className="w-full bg-transparent border-0 border-b border-border/60 focus:border-primary focus:outline-none py-2 font-serif text-lg tracking-widest placeholder:text-muted-foreground/40" />
              </div>
              <div>
                <label className="font-mono-label text-muted-foreground mb-2 block">Confirm</label>
                <input type="password" placeholder="••••••••"
                  className="w-full bg-transparent border-0 border-b border-border/60 focus:border-primary focus:outline-none py-2 font-serif text-lg tracking-widest placeholder:text-muted-foreground/40" />
              </div>
            </div>

            <label className="flex items-start gap-3 text-xs text-muted-foreground cursor-pointer pt-2">
              <input type="checkbox" className="mt-0.5 accent-primary" />
              <span className="font-serif italic">
                I accept the <a className="text-primary hover:underline">Terms of Sovereignty</a> and the <a className="text-primary hover:underline">Strategic Protocol</a>.
              </span>
            </label>

            <Button type="submit" variant="gold-outline" size="xl" className="w-full">
              Account Erstellen <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-4">
              <span className="flex-1 h-px bg-border/40" />
              <span className="font-mono-label text-muted-foreground">Or Continue With</span>
              <span className="flex-1 h-px bg-border/40" />
            </div>

            <button type="button"
              className="w-full border border-border/60 hover:border-primary/40 py-3 flex items-center justify-center gap-3 font-sans uppercase tracking-[0.2em] text-xs text-foreground hover:text-primary transition-colors rounded-sm">
              <span className="w-4 h-4 bg-foreground/80" />
              Google Identification
            </button>

            <p className="text-center font-serif italic text-sm text-muted-foreground pt-4">
              Already an initiate?{" "}
              <Link to="/login" className="font-sans uppercase tracking-[0.2em] text-xs text-primary hover:underline ml-2">Login Here</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
