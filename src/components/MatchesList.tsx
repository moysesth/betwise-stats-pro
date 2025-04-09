// @ts-nocheck
import { MatchCard } from "@/components/MatchCard";
import { useState, useEffect } from "react";
import { Bookmark, BookmarkCheck, Trophy, Calendar, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import PredictionForm from "./PredictionForm";

interface Match {
  fixture: {
    id: string;
    date: string;
    status: {
      short: string;
      long: string;
    };
  };
  league: {
    name: string;
    country: string;
    logo?: string;
  };
  teams: {
    home: {
      name: string;
      logo: string;
    };
    away: {
      name: string;
      logo: string;
    };
  };
  goals?: {
    home: number;
    away: number;
  };
  prediction?: {
    home: number;
    draw: number;
    away: number;
    btts: number;
    over2_5: number;
    confidence: number;
  };
  odds?: {
    home: number;
    draw: number;
    away: number;
  };
  probability?: number;
  valueBet?: boolean;
}

interface MatchesListProps {
  matches: Match[];
  favoriteMatches?: string[];
  onToggleFavorite: (match: Match) => void;
  isLoading: boolean;
}

export const MatchesList = ({
  matches,
  favoriteMatches = [],
  onToggleFavorite,
  isLoading,
}: MatchesListProps) => {
  const [matchesWithOdds, setMatchesWithOdds] = useState<Match[]>(matches);
  
  // Fetch odds data for matches
  const { data: oddsData } = useQuery({
    queryKey: ["match-odds", matches.map(m => m.fixture.id)],
    queryFn: async () => {
      if (!matches.length) return [];
      
      const { data, error } = await supabase.functions.invoke('odds-api', {
        body: {
          endpoint: 'match-odds',
          fixtureIds: matches.map(m => m.fixture.id)
        },
      });
      
      if (error) {
        console.error("Error fetching odds:", error);
        return [];
      }
      
      return data?.data || [];
    },
    enabled: matches.length > 0,
  });
  
  // Merge odds data with matches
  useEffect(() => {
    if (matches && oddsData) {
      const updatedMatches = matches.map(match => {
        const matchOdds = oddsData.find(o => o.match_id === match.fixture.id);
        
        if (matchOdds) {
          return {
            ...match,
            odds: {
              home: parseFloat(matchOdds.home_odds),
              draw: parseFloat(matchOdds.draw_odds),
              away: parseFloat(matchOdds.away_odds),
            }
          };
        }
        
        return match;
      });
      
      setMatchesWithOdds(updatedMatches);
    } else {
      setMatchesWithOdds(matches);
    }
  }, [matches, oddsData]);

  // Check if user has already predicted a match
  const { data: userPredictions } = useQuery({
    queryKey: ["user-predictions-check", matches.map(m => m.fixture.id)],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !matches.length) return [];
      
      const { data, error } = await supabase
        .from('user_predictions')
        .select('match_id, prediction')
        .eq('user_id', session.user.id)
        .in('match_id', matches.map(m => m.fixture.id.toString()));
        
      if (error) {
        console.error("Error fetching user predictions:", error);
        return [];
      }
      
      return data || [];
    },
    enabled: matches.length > 0,
  });
  
  // Helper function to check if a match has been predicted
  const hasPredicted = (matchId: string) => {
    return userPredictions?.some(p => p.match_id === matchId) || false;
  };
  
  // Helper function to get user prediction for a match
  const getUserPrediction = (matchId: string) => {
    return userPredictions?.find(p => p.match_id === matchId)?.prediction;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass rounded-lg p-4 animate-pulse">
            <div className="h-20 bg-secondary/50 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (matchesWithOdds.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhuma partida encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matchesWithOdds.map((match) => {
        const isFavorite = favoriteMatches.includes(match.fixture.id.toString());
        const matchDate = parseISO(match.fixture.date);
        const isLive = match.fixture.status.short === "1H" || match.fixture.status.short === "2H" || match.fixture.status.short === "HT";
        const isPredicted = hasPredicted(match.fixture.id.toString());
        const userPrediction = getUserPrediction(match.fixture.id.toString());
        
        return (
          <div key={match.fixture.id} className="glass rounded-lg p-4 card-hover slide-up">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {match.league.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isLive && (
                  <span className="text-xs font-bold bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full animate-pulse">
                    AO VIVO
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onToggleFavorite(match)}
                >
                  {isFavorite ? (
                    <BookmarkCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2">
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
                  {match.goals ? `${match.goals.home} - ${match.goals.away}` : format(matchDate, "HH:mm")}
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
                <div className={`bg-secondary/30 rounded-lg p-2 ${userPrediction === 'home' ? 'ring-2 ring-primary' : ''}`}>
                  <div className="text-xs text-muted-foreground">Casa</div>
                  <div className="font-bold">{match.prediction.home}%</div>
                  {match.odds && (
                    <div className="text-xs mt-1 text-blue-400">@{match.odds.home.toFixed(2)}</div>
                  )}
                </div>
                <div className={`bg-secondary/30 rounded-lg p-2 ${userPrediction === 'draw' ? 'ring-2 ring-primary' : ''}`}>
                  <div className="text-xs text-muted-foreground">Empate</div>
                  <div className="font-bold">{match.prediction.draw}%</div>
                  {match.odds && (
                    <div className="text-xs mt-1 text-blue-400">@{match.odds.draw.toFixed(2)}</div>
                  )}
                </div>
                <div className={`bg-secondary/30 rounded-lg p-2 ${userPrediction === 'away' ? 'ring-2 ring-primary' : ''}`}>
                  <div className="text-xs text-muted-foreground">Fora</div>
                  <div className="font-bold">{match.prediction.away}%</div>
                  {match.odds && (
                    <div className="text-xs mt-1 text-blue-400">@{match.odds.away.toFixed(2)}</div>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-secondary/30 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(matchDate, "dd/MM/yyyy")}
                </p>
                {match.prediction && (
                  <div className="mt-1 flex gap-2 text-xs">
                    {match.prediction.btts > 65 && (
                      <span className="px-1.5 py-0.5 rounded bg-secondary/50">
                        BTTS: {match.prediction.btts}%
                      </span>
                    )}
                    {match.prediction.over2_5 > 65 && (
                      <span className="px-1.5 py-0.5 rounded bg-secondary/50">
                        Over 2.5: {match.prediction.over2_5}%
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {!isPredicted && match.odds && (
                <PredictionForm match={match} />
              )}
              
              {isPredicted && (
                <span className="text-xs font-medium bg-green-500/20 text-green-500 px-2 py-1 rounded-full">
                  Previsão Registrada
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
