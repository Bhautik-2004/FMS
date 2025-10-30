'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ArrowRight, TrendingUp, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginModal } from '@/components/auth/login-modal';
import { SignupModal } from '@/components/auth/signup-modal';

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSwitchToSignup = () => {
    setLoginOpen(false);
    setSignupOpen(true);
  };

  const handleSwitchToLogin = () => {
    setSignupOpen(false);
    setLoginOpen(true);
  };

  return (
    <main className="flex h-screen w-full items-center justify-center overflow-hidden bg-background">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4">
        {mounted && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>

      <div className="w-full max-w-6xl px-6 text-center">
        {/* Hero Section */}
        <div className="space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <TrendingUp className="h-4 w-4" />
            Smart Financial Management
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl">
            Take Control of Your
            <span className="block text-primary">Financial Future</span>
          </h1>

          {/* Description */}
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Track expenses, manage budgets, and achieve your financial goals with our powerful 
            all-in-one financial management platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6 pt-4">
            <Button 
              size="lg" 
              className="gap-2 text-base"
              onClick={() => setLoginOpen(true)}
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-base"
              onClick={() => setSignupOpen(true)}
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <LoginModal 
        open={loginOpen} 
        onOpenChange={setLoginOpen}
        onSwitchToSignup={handleSwitchToSignup}
      />
      <SignupModal 
        open={signupOpen} 
        onOpenChange={setSignupOpen}
        onSwitchToLogin={handleSwitchToLogin}
      />

      {/* Footer */}
      <footer className="absolute bottom-0 w-full py-6 border-t border-border">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FMS. Made by{' '}
            <Link href="https://bhautikvaghamshi.vercel.app" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
              Bhautik
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
