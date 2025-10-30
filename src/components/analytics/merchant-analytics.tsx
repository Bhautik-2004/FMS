'use client';

import { useEffect, useState } from 'react';
import { useCurrency } from '@/contexts/currency-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Store } from 'lucide-react';

interface Props {
  period: string;
}

export function MerchantAnalytics({ period }: Props) {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/analytics/merchants?period=${period}`);
        const data = await res.json();
        setMerchants(data.merchants || []);
      } catch (error) {

      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [period]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Merchant Analytics
        </CardTitle>
        <CardDescription>Top merchants by spending and frequency</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : merchants.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No merchant data available for this period
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Avg/Transaction</TableHead>
                  <TableHead className="text-right">Last Visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchants.slice(0, 20).map((merchant, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {merchant.merchant_name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(Number(merchant.total_spent || 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {merchant.transaction_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(Number(merchant.avg_transaction || 0))}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(merchant.last_transaction_date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
