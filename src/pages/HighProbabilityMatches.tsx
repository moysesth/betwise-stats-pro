// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { Trophy, ChevronLeft, Percent } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { calculateMatchPrediction, MatchData } from "@/lib/prediction-models";

const HighProbabilityMatches = () => {
  const navigate = useNavigate();

  const { data: matches, isLoading } = useQuery({
    queryKey: ['matches-live'],
    queryFn: async () => {
      // Fetch live matches
      const { data: liveData, error: liveError } = await supabase.functions.invoke('football-api', {
        body: {
          endpoint: 'fixtures',
          params: {
            live: 'all'  // Busca jogos ao vivo
          },
        },
      });

      if (liveError) {
        console.error('Error fetching matches:', liveError);
        throw liveError;
      }

      // For each match, we need to fetch:
      // 1. Last 5 matches for each team
      // 2. Head-to-head history
      const matchesWithData = await Promise.all(
        liveData.response
          .filter((match: any) => match.fixture && match.fixture.status.short !== "PST")
          .map(async (match: any) => {
            try {
              // Convert to proper MatchData type
              const matchData: MatchData = {
                fixtureId: match.fixture.id,
                date: match.fixture.date,
                homeTeam: {
                  id: match.teams.home.id,
                  name: match.teams.home.name,
                  goals: match.goals?.home || 0
                },
                awayTeam: {
                  id: match.teams.away.id,
                  name: match.teams.away.name,
                  goals: match.goals?.away || 0
                },
                league: {
                  id: match.league.id,
                  name: match.league.name
                },
                status: match.fixture.status
              };

              // Get last 5 matches for home team
              const { data: homeFormData } = await supabase.functions.invoke('football-api', {
                body: {
                  endpoint: 'fixtures',
                  params: {
                    team: matchData.homeTeam.id,
                    last: 5
                  },
                },
              });
              
              // Get last 5 matches for away team
              const { data: awayFormData } = await supabase.functions.invoke('football-api', {
                body: {
                  endpoint: 'fixtures',
                  params: {
                    team: matchData.awayTeam.id,
                    last: 5
                  },
                },
              });
              
              // Get head-to-head matches
              const { data: h2hData } = await supabase.functions.invoke('football-api', {
                body: {
                  endpoint: 'fixtures/headtohead',
                  params: {
                    h2h: `${matchData.homeTeam.id}-${matchData.awayTeam.id}`,
                    last: 5
                  },
                },
              });

              // Calculate prediction using our model
              const homeForm = homeFormData?.response || [];
              const awayForm = awayFormData?.response || [];
              const h2h = h2hData?.response || [];

              const prediction = calculateMatchPrediction(
                matchData, 
                h2h, 
                homeForm, 
                awayForm
              );

              // Return match with prediction data
              return {
                fixture: {
                  id: match.fixture.id,
                  date: match.fixture.date,
                  status: match.fixture.status
                },
                league: {
                  name: match.league.name,
                  country: match.league.country
                },
                teams: {
                  home: {
                    name: match.teams.home.name,
                    logo: match.teams.home.logo
                  },
                  away: {
                    name: match.teams.away.name,
                    logo: match.teams.away.logo
                  }
                },
                goals: match.goals,
                prediction: prediction,
                // Use home win probability as the main probability indicator
                probability: prediction.home,
                valueBet: prediction.confidence > 70,
                expectedGoals: {
                  home: (homeForm.reduce((sum, m) => sum + (m.goals?.home || 0), 0) / Math.max(1, homeForm.length)).toFixed(1),
                  away: (awayForm.reduce((sum, m) => sum + (m.goals?.away || 0), 0) / Math.max(1, awayForm.length)).toFixed(1)
                }
              };
            } catch (error) {
              console.error(`Error processing match ${match.fixture.id}:`, error);
              // Fallback to a simpler version without predictions if API calls fail
              return {
                fixture: {
                  id: match.fixture.id,
                  date: match.fixture.date,
                  status: match.fixture.status
                },
                league: {
                  name: match.league.name,
                  country: match.league.country
                },
                teams: {
                  home: {
                    name: match.teams.home.name,
                    logo: match.teams.home.logo
                  },
                  away: {
                    name: match.teams.away.name,
                    logo: match.teams.away.logo
                  }
                },
                goals: match.goals,
                // Fallback probability (only used if API calls fail)
                probability: 70,
                valueBet: false
              };
            }
          })
      );

      // Sort by probability (highest first)
      return matchesWithData
        .filter(match => match.probability >= 65) // Only show high probability matches
        .sort((a, b) => b.probability - a.probability);
    },
    refetchInterval: 60000 // Update every minute
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <header className="glass sticky top-0 z-50 p-4 mb-6">
        <div className="container mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Melhores Chances do Dia
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-8">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass rounded-lg p-4 animate-pulse">
                <div className="h-20 bg-secondary/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : matches?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhuma partida encontrada no momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches?.map((match: any) => (
              <div key={match.fixture.id} className="glass rounded-lg p-4 card-hover slide-up">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      {match.league.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-bold text-green-500">
                      {Math.round(match.probability)}%
                    </span>
                    {match.valueBet && (
                      <span className="text-xs font-bold bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">
                        Value Bet
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex-1 flex items-center gap-2">
                    <img 
                      src={match.teams.home.logo} 
                      alt={match.teams.home.name} 
                      className="w-6 h-6 object-contain" 
                    />
                    <h3 className="font-semibold truncate">
                      {match.teams.home.name}
                    </h3>
                  </div>
                  <div className="px-4 py-2 bg-secondary rounded-lg mx-4">
                    <span className="text-sm font-medium">
                      {match.goals ? `${match.goals.home} - ${match.goals.away}` : format(new Date(match.fixture.date), "HH:mm")}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center gap-2 justify-end">
                    <h3 className="font-semibold truncate">
                      {match.teams.away.name}
                    </h3>
                    <img 
                      src={match.teams.away.logo} 
                      alt={match.teams.away.name} 
                      className="w-6 h-6 object-contain" 
                    />
                  </div>
                </div>

                {match.prediction && (
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-secondary/30 rounded-lg p-2">
                      <div className="text-xs text-muted-foreground">Home</div>
                      <div className="font-bold">{match.prediction.home}%</div>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-2">
                      <div className="text-xs text-muted-foreground">Draw</div>
                      <div className="font-bold">{match.prediction.draw}%</div>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-2">
                      <div className="text-xs text-muted-foreground">Away</div>
                      <div className="font-bold">{match.prediction.away}%</div>
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Status: <span className="font-semibold text-primary">
                      {match.fixture.status.short === "1H" ? "1º Tempo" :
                       match.fixture.status.short === "HT" ? "Intervalo" :
                       match.fixture.status.short === "2H" ? "2º Tempo" :
                       match.fixture.status.short === "FT" ? "Finalizado" : "Em breve"}
                    </span>
                  </p>
                  {match.prediction && (
                    <div className="mt-2 flex justify-between text-xs">
                      <span>BTTS: <span className="font-bold">{match.prediction.btts}%</span></span>
                      <span>Over 2.5: <span className="font-bold">{match.prediction.over2_5}%</span></span>
                      <span>Confiança: <span className="font-bold">{match.prediction.confidence}%</span></span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HighProbabilityMatches;
