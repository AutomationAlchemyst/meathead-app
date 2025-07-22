import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers'; // We import the client-side wrapper here
import { Inter } from 'next/font/google';
import Image from 'next/image';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'MeatHead - Powered by WorkFlowGuys. Designed by Ath Thaariq Marthas.',
  description: 'Your Punk Rock Keto Journey. Powered by WorkFlowguys. Designed by Ath Thaariq Marthas.',
  icons: {
    icon: [],
    apple: [],
    shortcut: [],
  },
};

/**
 * This is the root server component for the entire application.
 * It sets up the basic HTML structure and uses the <Providers> component
 * to handle all client-side logic.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head />
      <body className="font-body antialiased flex flex-col min-h-screen bg-background text-foreground">
        <Providers>
          <main className="flex-1">
            {children}
          </main>
          
          <footer className="py-6 px-4 text-center text-xs sm:text-sm text-muted-foreground">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-2 flex-wrap">
              <span>© {new Date().getFullYear()} MeatHead.</span>
              <div className="flex items-center">
                <Image 
                  src="/combined_logo.png" 
                  alt="MeatHead and WorkFlowGuys Combined Logo" 
                  width={150}
                  height={30}
                  data-ai-hint="combined brand logo"
                  className="h-auto"
                />
              </div>
              <span>Designed by Ath Thaariq Marthas.</span>
              <span>All rights reserved.</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
