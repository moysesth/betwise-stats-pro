// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";

// Types for user predictions
interface UserPrediction {
  id: string;
  user_id: string;
  match_id: string;
  prediction: "home" | "draw" | "away";
  odds: number;
  stake: number;
  result?: "win" | "loss" | "pending";
  created_at: string;
  match_date: string;
  home_team: string;
  away_team: string;
  league: string;
  final_score?: {
    home: number;
    away: number;
  };
}

// Types for statistics
interface PredictionStats {
  total: number;
  wins: number;
  losses: number;
  pending: number;
  profit: number;
  roi: number;
  winRate: number;
  avgOdds: number;
  bestLeague?: string;
  worstLeague?: string;
}

const COLORS = ["#10b981", "#ef4444", "#6b7280"];

const PredictionTracking = () => {
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "all">("30days");
  const [stats, setStats] = useState<PredictionStats>({
    total: 0,
    wins: 0,
    losses: 0,
    pending: 0,
    profit: 0,
    roi: 0,
    winRate: 0,
    avgOdds: 0,
  });

  // Fetch user prediction history
  const { data: predictions, isLoading } = useQuery({
    queryKey: ["user-predictions", timeRange],
    queryFn: async () => {
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para ver seu histórico de apostas.",
          variant: "destructive"
        });
        return null;
      }

      // Calculate date range based on selected time range
      let dateFilter;
      if (timeRange === "7days") {
        dateFilter = format(subDays(new Date(), 7), "yyyy-MM-dd");
      } else if (timeRange === "30days") {
        dateFilter = format(subDays(new Date(), 30), "yyyy-MM-dd");
      }

      // Query for user predictions
      let query = supabase
        .from('user_predictions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      // Apply date filter if needed
      if (dateFilter && timeRange !== "all") {
        query = query.gte('created_at', dateFilter);
      }

      const { data, error } = await query;
      
      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao carregar histórico de previsões.",
          variant: "destructive"
        });
        throw error;
      }
      
      return data as UserPrediction[];
    },
  });

  // Calculate statistics whenever predictions data changes
  useEffect(() => {
    if (!predictions || predictions.length === 0) return;

    // Initialize counters
    let wins = 0;
    let losses = 0;
    let pending = 0;
    let totalStake = 0;
    let totalReturns = 0;
    let totalOdds = 0;
    const leagueStats: Record<string, { count: number; wins: number }> = {};

    // Process each prediction
    predictions.forEach(pred => {
      // Count by result
      if (pred.result === "win") {
        wins++;
        totalReturns += pred.stake * pred.odds;
        
        // Track league performance
        if (!leagueStats[pred.league]) {
          leagueStats[pred.league] = { count: 0, wins: 0 };
        }
        leagueStats[pred.league].count++;
        leagueStats[pred.league].wins++;
      } else if (pred.result === "loss") {
        losses++;
        
        // Track league performance
        if (!leagueStats[pred.league]) {
          leagueStats[pred.league] = { count: 0, wins: 0 };
        }
        leagueStats[pred.league].count++;
      } else {
        pending++;
      }

      // Accumulate total stake and odds
      totalStake += pred.stake;
      totalOdds += pred.odds;
    });

    // Find best and worst leagues
    let bestLeague = "";
    let bestWinRate = 0;
    let worstLeague = "";
    let worstWinRate = 1;

    Object.entries(leagueStats)
      .filter(([_, stats]) => stats.count >= 5) // Only consider leagues with at least 5 bets
      .forEach(([league, stats]) => {
        const winRate = stats.wins / stats.count;
        if (winRate > bestWinRate) {
          bestWinRate = winRate;
          bestLeague = league;
        }
        if (winRate < worstWinRate) {
          worstWinRate = winRate;
          worstLeague = league;
        }
      });

    // Calculate final statistics
    const total = wins + losses + pending;
    const profit = totalReturns - totalStake;
    const roi = totalStake > 0 ? (profit / totalStake) * 100 : 0;
    const winRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;
    const avgOdds = total > 0 ? totalOdds / total : 0;

    // Update state with calculated stats
    setStats({
      total,
      wins,
      losses,
      pending,
      profit,
      roi,
      winRate,
      avgOdds,
      bestLeague: bestLeague || undefined,
      worstLeague: worstLeague || undefined,
    });
  }, [predictions]);

  // Prepare data for charts
  const pieData = [
    { name: "Vitórias", value: stats.wins },
    { name: "Derrotas", value: stats.losses },
    { name: "Pendentes", value: stats.pending },
  ];

  const profitData = predictions
    ? predictions
        .slice()
        .reverse()
        .reduce((acc: any[], pred, index) => {
          const prevProfit = index > 0 ? acc[index - 1].profit : 0;
          const dailyProfit = pred.result === "win" 
            ? pred.stake * pred.odds - pred.stake
            : pred.result === "loss" ? -pred.stake : 0;
          
          acc.push({
            date: format(parseISO(pred.created_at.split("T")[0]), "dd/MM"),
            profit: prevProfit + dailyProfit,
            bet: pred.home_team + " vs " + pred.away_team,
          });
          
          return acc;
        }, [])
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Desempenho das suas Previsões</CardTitle>
          <CardDescription>
            Acompanhe sua performance e aprenda com seus resultados
          </CardDescription>
          <div className="flex justify-end">
            <TabsList>
              <TabsTrigger 
                value="7days" 
                onClick={() => setTimeRange("7days")}
                className={timeRange === "7days" ? "bg-primary text-primary-foreground" : ""}
              >
                7 dias
              </TabsTrigger>
              <TabsTrigger 
                value="30days" 
                onClick={() => setTimeRange("30days")}
                className={timeRange === "30days" ? "bg-primary text-primary-foreground" : ""}
              >
                30 dias
              </TabsTrigger>
              <TabsTrigger 
                value="all" 
                onClick={() => setTimeRange("all")}
                className={timeRange === "all" ? "bg-primary text-primary-foreground" : ""}
              >
                Histórico
              </TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
            </div>
          ) : !predictions || predictions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Você ainda não possui previsões registradas.
              </p>
              <p className="mt-2">
                Faça suas previsões para começar a acompanhar seu desempenho.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Key metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass p-4 rounded-lg text-center">
                  <p className="text-muted-foreground text-sm">Taxa de Acerto</p>
                  <p className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</p>
                </div>
                <div className="glass p-4 rounded-lg text-center">
                  <p className="text-muted-foreground text-sm">ROI</p>
                  <p className="text-2xl font-bold" style={{ color: stats.roi >= 0 ? '#10b981' : '#ef4444' }}>
                    {stats.roi.toFixed(1)}%
                  </p>
                </div>
                <div className="glass p-4 rounded-lg text-center">
                  <p className="text-muted-foreground text-sm">Lucro</p>
                  <p className="text-2xl font-bold" style={{ color: stats.profit >= 0 ? '#10b981' : '#ef4444' }}>
                    R$ {stats.profit.toFixed(2)}
                  </p>
                </div>
                <div className="glass p-4 rounded-lg text-center">
                  <p className="text-muted-foreground text-sm">Média de Odds</p>
                  <p className="text-2xl font-bold">{stats.avgOdds.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Pie chart for win/loss ratio */}
                <div className="glass p-4 rounded-lg">
                  <h3 className="text-center text-sm font-medium mb-2">Distribuição de Resultados</h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value} previsões`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Profit chart */}
                <div className="glass p-4 rounded-lg md:col-span-2">
                  <h3 className="text-center text-sm font-medium mb-2">Evolução do Lucro</h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={profitData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number, name: string, props: any) => {
                            return [`R$ ${value.toFixed(2)}`, 'Lucro acumulado'];
                          }}
                          labelFormatter={(label, items) => {
                            const item = items[0];
                            return item ? item.payload.bet : label;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="profit" 
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* League insights */}
              {(stats.bestLeague || stats.worstLeague) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.bestLeague && (
                    <div className="glass p-4 rounded-lg">
                      <h3 className="text-sm font-medium">Melhor Liga</h3>
                      <p className="text-xl font-bold mt-2">{stats.bestLeague}</p>
                    </div>
                  )}
                  {stats.worstLeague && (
                    <div className="glass p-4 rounded-lg">
                      <h3 className="text-sm font-medium">Liga para Evitar</h3>
                      <p className="text-xl font-bold mt-2">{stats.worstLeague}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent predictions list */}
      {predictions && predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Previsões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {predictions.map((prediction) => (
                <div 
                  key={prediction.id} 
                  className={`glass p-4 rounded-lg border-l-4 ${
                    prediction.result === "win" 
                      ? "border-green-500" 
                      : prediction.result === "loss" 
                      ? "border-red-500" 
                      : "border-gray-500"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {prediction.home_team} vs {prediction.away_team}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {prediction.league} • {format(parseISO(prediction.match_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {prediction.prediction === "home" 
                          ? prediction.home_team + " (Casa)" 
                          : prediction.prediction === "away" 
                          ? prediction.away_team + " (Fora)" 
                          : "Empate"}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Odds:</span> {prediction.odds.toFixed(2)} • 
                        <span className="text-muted-foreground ml-1">Stake:</span> R$ {prediction.stake.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  {prediction.final_score && (
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Resultado Final:</span>{" "}
                      {prediction.final_score.home} - {prediction.final_score.away}
                    </div>
                  )}
                  
                  <div className="mt-2">
                    <span 
                      className={`text-xs px-2 py-1 rounded-full ${
                        prediction.result === "win" 
                          ? "bg-green-500/20 text-green-500" 
                          : prediction.result === "loss" 
                          ? "bg-red-500/20 text-red-500" 
                          : "bg-gray-500/20 text-gray-500"
                      }`}
                    >
                      {prediction.result === "win" 
                        ? "Ganhou" 
                        : prediction.result === "loss" 
                        ? "Perdeu" 
                        : "Pendente"}
                    </span>
                    
                    {prediction.result === "win" && (
                      <span className="text-xs ml-2 text-green-500">
                        +R$ {((prediction.stake * prediction.odds) - prediction.stake).toFixed(2)}
                      </span>
                    )}
                    
                    {prediction.result === "loss" && (
                      <span className="text-xs ml-2 text-red-500">
                        -R$ {prediction.stake.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Os resultados são atualizados automaticamente após a conclusão das partidas.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default PredictionTracking;
