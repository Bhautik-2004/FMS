'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Award, TrendingUp, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAnalytics } from '@/hooks/use-analytics';

interface HealthScoreData {
  overall_score: number;
  savings_score: number;
  spending_score: number;
  budget_score: number;
  consistency_score: number;
  trend_score: number;
  grade: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export function FinancialHealthScore() {
  const { healthScore, isLoading } = useAnalytics('6M');
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!healthScore) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No health score data available
        </CardContent>
      </Card>
    );
  }

  const healthData: HealthScoreData = healthScore;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800 border-green-300';
    if (grade === 'B') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (grade === 'C') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (grade === 'D') return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const scoreBreakdown = [
    { label: 'Savings', score: healthData.savings_score, max: 30 },
    { label: 'Spending', score: healthData.spending_score, max: 25 },
    { label: 'Budget', score: healthData.budget_score, max: 25 },
    { label: 'Consistency', score: healthData.consistency_score, max: 10 },
    { label: 'Trend', score: healthData.trend_score, max: 10 },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Overall Score Card */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Financial Health Score
          </CardTitle>
          <CardDescription>Based on last 3 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div
                className={`text-6xl font-bold ${getScoreColor(healthData.overall_score)}`}
              >
                {healthData.overall_score}
              </div>
              <div className="text-sm text-muted-foreground text-center mt-1">out of 100</div>
            </div>

            <Badge variant="outline" className={`text-2xl py-2 px-4 ${getGradeColor(healthData.grade)}`}>
              Grade: {healthData.grade}
            </Badge>

            <Progress value={healthData.overall_score} className="w-full h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown Card */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Score Breakdown</CardTitle>
          <CardDescription>Component scores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scoreBreakdown.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">
                    {item.score}/{item.max}
                  </span>
                </div>
                <Progress value={(item.score / item.max) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights Card */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Insights & Recommendations</CardTitle>
          <CardDescription>Areas to focus on</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Strengths */}
            {healthData.strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Strengths
                </h4>
                <ul className="space-y-1">
                  {healthData.strengths.map((strength, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {healthData.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  Areas for Improvement
                </h4>
                <ul className="space-y-1">
                  {healthData.weaknesses.map((weakness, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-amber-600">•</span>
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {healthData.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  Recommendations
                </h4>
                <ul className="space-y-1">
                  {healthData.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
