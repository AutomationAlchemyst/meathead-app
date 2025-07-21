
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster";
import { Inter } from 'next/font/google';
import Image from 'next/image'; // Added import for next/image

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        {/* next/font/google handles necessary preconnects and preloads */}
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen bg-background text-foreground">
        <AuthProvider>
          <main className="flex-1">
            {children}
          </main>
          
          <Toaster />

          <footer className="py-6 px-4 text-center text-xs sm:text-sm text-muted-foreground">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-2 flex-wrap">
              <span>© {new Date().getFullYear()} MeatHead.</span>
              <div className="flex items-center">
                <Image 
                  src="/combined_logo.png" 
                  alt="MeatHead and WorkFlowGuys Combined Logo" 
                  width={150} // Adjust width as needed
                  height={30}  // Adjust height as needed
                  data-ai-hint="combined brand logo"
                  className="h-auto" // Maintain aspect ratio
                  // onError prop removed to fix the runtime error
                />
              </div>
              <span>Designed by Ath Thaariq Marthas.</span>
              <span>All rights reserved.</span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
