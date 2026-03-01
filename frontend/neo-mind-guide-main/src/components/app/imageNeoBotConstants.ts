/**
 * Constants and option lists for ImageNeoBotWorkspace.
 * Kept in a separate module with no app/UI imports to avoid circular dependencies
 * and TDZ ("Cannot access 'format22' before initialization") in the bundle.
 */
import type { ElementType } from "react";
import {
  Instagram,
  ShoppingBag,
  Megaphone,
  Palette,
  Wand2,
} from "lucide-react";

export interface ImageFunction {
  id: string;
  label: string;
  description: string;
  defaultFormat: "square" | "portrait" | "landscape" | "story";
}

export interface FunctionCategory {
  id: string;
  title: string;
  icon: ElementType;
  functions: ImageFunction[];
}

export const functionCategories: FunctionCategory[] = [
  {
    id: "social",
    title: "Sociální sítě",
    icon: Instagram,
    functions: [
      { id: "instagram-post", label: "Příspěvek na Instagram", description: "Vizuálně atraktivní grafika pro Instagram feed.", defaultFormat: "square" },
      { id: "facebook-post", label: "Facebook post", description: "Vizuál optimalizovaný pro Facebook.", defaultFormat: "landscape" },
      { id: "stories", label: "Instagram Stories", description: "Vertikální grafika pro příběhy.", defaultFormat: "story" },
      { id: "reel-cover", label: "Reel cover / náhled", description: "Poutavý náhled pro Reels nebo TikTok.", defaultFormat: "portrait" },
    ],
  },
  {
    id: "products",
    title: "Produkty & e-shop",
    icon: ShoppingBag,
    functions: [
      { id: "product-visual", label: "Produktový vizuál", description: "Profesionální vizualizace produktu.", defaultFormat: "square" },
      { id: "lifestyle", label: "Lifestyle fotka", description: "Produkt v reálném prostředí.", defaultFormat: "landscape" },
      { id: "white-bg", label: "Produkt na bílém pozadí", description: "Čistá produktová fotografie.", defaultFormat: "square" },
      { id: "banner", label: "Produktový banner", description: "Banner pro e-shop nebo reklamu.", defaultFormat: "landscape" },
    ],
  },
  {
    id: "ads",
    title: "Reklama & bannery",
    icon: Megaphone,
    functions: [
      { id: "ad-banner", label: "Reklamní banner", description: "Banner pro online reklamní kampaně.", defaultFormat: "landscape" },
      { id: "hero-visual", label: "Hero vizuál", description: "Hlavní vizuál pro kampaň.", defaultFormat: "landscape" },
      { id: "promo", label: "Promo grafika", description: "Grafika pro akce a novinky.", defaultFormat: "square" },
      { id: "banner-16-9", label: "Banner (16:9)", description: "Široký banner pro web a reklamu.", defaultFormat: "landscape" },
      { id: "letak-4-5", label: "Leták / promo (4:5)", description: "Vertikální leták pro Instagram a print.", defaultFormat: "portrait" },
      { id: "letak-1-1", label: "Leták / promo (1:1)", description: "Čtvercový leták pro sociální sítě.", defaultFormat: "square" },
    ],
  },
  {
    id: "branding",
    title: "Branding & identita",
    icon: Palette,
    functions: [
      { id: "brand-visual", label: "Vizuál značky", description: "Vizuál reprezentující hodnoty značky.", defaultFormat: "square" },
      { id: "moodboard", label: "Moodboard", description: "Inspirační koláž pro vizuální směr.", defaultFormat: "landscape" },
      { id: "style-images", label: "Stylové obrázky", description: "Série konzistentních vizuálů.", defaultFormat: "square" },
    ],
  },
  {
    id: "edits",
    title: "Úpravy & varianty",
    icon: Wand2,
    functions: [
      { id: "variant", label: "Varianta vizuálu", description: "Nová verze stávajícího obrázku.", defaultFormat: "square" },
      { id: "style-change", label: "Jiný styl", description: "Změna stylu nebo atmosféry.", defaultFormat: "square" },
      { id: "format-change", label: "Jiný formát", description: "Přizpůsobení poměru stran.", defaultFormat: "square" },
    ],
  },
];

export const styleOptions = [
  { id: "minimalist", label: "Minimalistický" },
  { id: "luxury", label: "Luxusní" },
  { id: "playful", label: "Hravý" },
  { id: "natural", label: "Přirozený" },
];

export const formatOptions = [
  { id: "square", label: "1:1 (čtverec)" },
  { id: "portrait", label: "9:16 (výška)" },
  { id: "landscape", label: "16:9 (šířka)" },
  { id: "story", label: "Story (9:16)" },
];

export const purposeOptions = [
  { id: "prodej", label: "Prodej" },
  { id: "brand", label: "Brand" },
  { id: "engagement", label: "Engagement" },
  { id: "edukace", label: "Edukace" },
];

export const colorOptions = [
  { id: "neutral", label: "Neutrální" },
  { id: "warm", label: "Teplé" },
  { id: "cool", label: "Studené" },
  { id: "vibrant", label: "Výrazné" },
];
