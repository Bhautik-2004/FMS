'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Character variety checks
    if (/[a-z]/.test(password)) score++; // lowercase
    if (/[A-Z]/.test(password)) score++; // uppercase
    if (/[0-9]/.test(password)) score++; // numbers
    if (/[^a-zA-Z0-9]/.test(password)) score++; // special chars
    
    // Determine label and color
    if (score <= 2) {
      return { score: 1, label: 'Weak', color: 'bg-red-500' };
    } else if (score <= 4) {
      return { score: 2, label: 'Fair', color: 'bg-yellow-500' };
    } else if (score <= 5) {
      return { score: 3, label: 'Good', color: 'bg-blue-500' };
    } else {
      return { score: 4, label: 'Strong', color: 'bg-green-500' };
    }
  }, [password]);
  
  if (!password) return null;
  
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              level <= strength.score ? strength.color : 'bg-gray-200'
            )}
          />
        ))}
      </div>
      <p className="text-xs text-gray-600">
        Password strength: <span className="font-medium">{strength.label}</span>
      </p>
    </div>
  );
}
