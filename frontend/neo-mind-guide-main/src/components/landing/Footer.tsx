import neobotLogo from "@/assets/neobot-logo.png";

export const Footer = () => {
  return (
    <footer className="py-12 border-t border-border/50">
      <div className="container px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center">
            <img src={neobotLogo} alt="NeoBot" className="h-14 w-auto" />
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Podmínky</a>
            <a href="#" className="hover:text-foreground transition-colors">Soukromí</a>
            <a href="#" className="hover:text-foreground transition-colors">Kontakt</a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © 2024 NeoBot. Všechna práva vyhrazena.
          </p>
        </div>
      </div>
    </footer>
  );
};
