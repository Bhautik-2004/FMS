'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'INR' | 'CAD' | 'AUD' | 'CHF';

interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  locale: string;
}

const CURRENCY_CONFIGS: Record<Currency, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-EU' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
};

interface CurrencyContextType {
  currency: Currency;
  currencyConfig: CurrencyConfig;
  formatCurrency: (amount: number) => string;
  setCurrency: (currency: Currency) => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Load currency from user profile
  useEffect(() => {
    loadUserCurrency();
  }, []);

  const loadUserCurrency = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('currency')
        .eq('id', user.id)
        .single();

      if (profile && profile.currency) {
        setCurrencyState(profile.currency as Currency);
      }
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  const setCurrency = async (newCurrency: Currency) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update in database
      const { error } = await supabase
        .from('user_profiles')
        .update({ currency: newCurrency })
        .eq('id', user.id);

      if (!error) {
        setCurrencyState(newCurrency);
      }
    } catch (error) {

    }
  };

  const formatCurrency = (amount: number): string => {
    const config = CURRENCY_CONFIGS[currency];
    
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const currencyConfig = CURRENCY_CONFIGS[currency];

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyConfig,
        formatCurrency,
        setCurrency,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
