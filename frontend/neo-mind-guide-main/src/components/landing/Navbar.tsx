import { Link } from "react-router-dom";
import neobotLogo from "@/assets/neobot-logo.png";

export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src={neobotLogo} alt="NeoBot" className="h-14 w-auto" />
          </Link>

          {/* Nav links - hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/funkce" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Funkce
            </Link>
            <Link to="/cenik" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Ceník
            </Link>
            <Link to="/navody" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Návody
            </Link>
            <Link to="/novinky" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Novinky
            </Link>
            <Link to="/o-nas" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              O nás
            </Link>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link to="/start" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Přihlásit se
            </Link>
            <Link
              to="/start"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Vyzkoušet
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
