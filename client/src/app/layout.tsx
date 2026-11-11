import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Necro-MUD — Your Repository Is Your Dungeon',
  description: 'A multiplayer ANSI-art terminal dungeon accessible via retro CRT web interface. Kiroween 2026 Hackathon.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">☠</text></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className="bg-black text-crt-green font-mono antialiased overflow-hidden"
        style={{ fontFamily: '"Courier New", "Lucida Console", Monaco, monospace' }}
      >
        {children}
      </body>
    </html>
  );
}

