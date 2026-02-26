import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ValuePropositionSection } from "@/components/landing/ValuePropositionSection";
import { InteractiveDemoSection } from "@/components/landing/InteractiveDemoSection";
import { ProblemSolutionSection } from "@/components/landing/ProblemSolutionSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <ValuePropositionSection />
        <InteractiveDemoSection />
        <ProblemSolutionSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
