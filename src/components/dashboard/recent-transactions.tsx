'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useCurrency } from '@/contexts/currency-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  categoryColor?: string;
  categoryIcon?: string;
  amount: number;
  account: string;
  type: 'income' | 'expense';
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

// Get icon component
const getIcon = (iconName?: string) => {
  if (!iconName) return Icons.Tag;
  return (Icons as any)[iconName] || Icons.Tag;
};

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { formatCurrency } = useCurrency();
  
  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest financial activities</CardDescription>
        </div>
        <Link href="/transactions">
          <Button variant="outline" size="sm">
            View All
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <ArrowUpRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-1">No transactions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start tracking your finances by adding your first transaction
            </p>
            <Link href="/transactions/add">
              <Button size="sm">
                Add Transaction
              </Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const IconComponent = getIcon(transaction.categoryIcon);
                const isIncome = transaction.type === 'income';
                const categoryColor = transaction.categoryColor || '#6b7280';
                
                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {new Date(transaction.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{transaction.description}</span>
                    </TableCell>
                    <TableCell>
                      {transaction.category === 'Uncategorized' ? (
                        <span className="text-muted-foreground">Uncategorized</span>
                      ) : (
                        <Badge
                          variant="secondary"
                          style={{ 
                            backgroundColor: categoryColor + '20', 
                            color: categoryColor 
                          }}
                        >
                          <IconComponent className="mr-1 h-3 w-3" />
                          {transaction.category}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{transaction.account}</span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium',
                        isIncome ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
