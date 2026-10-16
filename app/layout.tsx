import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pricewise — One product. Every verified price.",
  description: "Paste a product link. Compare exact variants across supported Indian retailers, with transparent verification and no sponsored rankings.",
  applicationName: "Pricewise",
  icons: { icon: process.env.NEXT_PUBLIC_PRICEWISE_UI_ONLY === "1" ? "./icon.svg" : "/icon.svg" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
