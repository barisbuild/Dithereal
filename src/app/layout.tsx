import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dithereal.dev"),
  title: {
    default: "Dithereal",
    template: "%s | Dithereal",
  },
  description: "Dithered WebGL components for React.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <footer className="border-t border-border">
            <div className="mx-auto grid max-w-[1440px] gap-4 px-4 py-8 text-sm text-muted-foreground sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-6 lg:px-8">
              <p>dithereal</p>
              <p className="max-w-[64ch] text-xs leading-relaxed sm:justify-self-center sm:text-center">
                Inspired by{" "}
                <a className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground" href="https://www.tripwire.sh/dither-kit" target="_blank" rel="noreferrer">Dither Kit</a>
                {" "}and{" "}
                <a className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground" href="https://magicui.design" target="_blank" rel="noreferrer">Magic UI</a>
                . Interaction primitives by{" "}
                <a className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground" href="https://react-aria.adobe.com" target="_blank" rel="noreferrer">React Aria</a>
                .
              </p>
              <a
                className="w-fit transition-colors hover:text-foreground"
                href="https://github.com/barisbuild/Dithereal"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
