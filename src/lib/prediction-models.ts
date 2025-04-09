import { format, subMonths, differenceInDays } from 'date-fns';

// Define types for match statistics
export interface TeamForm {
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  matches: number;
}

export interface MatchData {
  fixtureId: number;
  date: string;
  homeTeam: {
    id: number;
    name: string;
    form?: TeamForm;
    goals?: number; 
  };
  awayTeam: {
    id: number;
    name: string;
    form?: TeamForm;
    goals?: number; 
  };
  league: {
    id: number;
    name: string;
  };
  status: {
    short: string;
    long: string;
  };
}

export interface MatchPrediction {
  home: number; 
  draw: number; 
  away: number; 
  btts: number; 
  over2_5: number; 
  confidence: number; 
}

/**
 * Calculate match predictions based on team form, head-to-head, and other factors
 */
export function calculateMatchPrediction(
  match: MatchData, 
  h2h: MatchData[] = [], 
  homeForm: MatchData[] = [], 
  awayForm: MatchData[] = []
): MatchPrediction {
  // Get team forms or initialize with defaults
  const homeTeamForm = processTeamForm(homeForm, true);
  const awayTeamForm = processTeamForm(awayForm, false);
  
  // Calculate head-to-head statistics
  const h2hStats = processHeadToHead(h2h, match.homeTeam.id, match.awayTeam.id);
  
  // Factor in home advantage (typically around 60% for most leagues)
  const homeAdvantage = 1.3; 
  
  // Calculate base probabilities from form
  let homeProbability = calculateBaseProbability(homeTeamForm, awayTeamForm, true) * homeAdvantage;
  let awayProbability = calculateBaseProbability(awayTeamForm, homeTeamForm, false);
  
  // Adjust based on H2H results
  if (h2hStats.matches > 0) {
    homeProbability = homeProbability * 0.7 + (h2hStats.homeWinRate * 100) * 0.3;
    awayProbability = awayProbability * 0.7 + (h2hStats.awayWinRate * 100) * 0.3;
  }
  
  // Handle recency bias - more recent matches have higher importance
  applyRecencyBias(match, homeForm, awayForm, homeProbability, awayProbability);
  
  // Calculate draw probability (ensures total adds to 100%)
  let drawProbability = Math.max(0, 100 - homeProbability - awayProbability);
  
  // Normalize to ensure probabilities sum to 100%
  const total = homeProbability + drawProbability + awayProbability;
  homeProbability = (homeProbability / total) * 100;
  drawProbability = (drawProbability / total) * 100;
  awayProbability = (awayProbability / total) * 100;
  
  // Calculate BTTS and over/under probabilities
  const btts = calculateBTTSProbability(homeTeamForm, awayTeamForm);
  const over2_5 = calculateOver2_5Probability(homeTeamForm, awayTeamForm);
  
  // Calculate confidence based on data quality
  const confidence = calculateConfidenceLevel(homeForm.length, awayForm.length, h2h.length);
  
  return {
    home: Math.round(homeProbability),
    draw: Math.round(drawProbability),
    away: Math.round(awayProbability),
    btts: Math.round(btts),
    over2_5: Math.round(over2_5),
    confidence: Math.round(confidence)
  };
}

/**
 * Process team form data into aggregated statistics
 */
function processTeamForm(matches: MatchData[], isHome: boolean): TeamForm {
  // Default form if no matches available
  if (!matches.length) {
    return {
      wins: 0,
      draws: 0,
      losses: 0,
      goalsScored: 0,
      goalsConceded: 0,
      matches: 0
    };
  }
  
  return matches.reduce((form, match) => {
    const teamId = isHome ? match.homeTeam.id : match.awayTeam.id;
    const isTeamHome = match.homeTeam.id === teamId;
    
    // Get goals for current team and opposition
    const goalsFor = isTeamHome ? match.homeTeam.goals || 0 : match.awayTeam.goals || 0;
    const goalsAgainst = isTeamHome ? match.awayTeam.goals || 0 : match.homeTeam.goals || 0;
    
    // Update form based on match result
    return {
      wins: form.wins + (goalsFor > goalsAgainst ? 1 : 0),
      draws: form.draws + (goalsFor === goalsAgainst ? 1 : 0),
      losses: form.losses + (goalsFor < goalsAgainst ? 1 : 0),
      goalsScored: form.goalsScored + goalsFor,
      goalsConceded: form.goalsConceded + goalsAgainst,
      matches: form.matches + 1
    };
  }, {
    wins: 0,
    draws: 0,
    losses: 0,
    goalsScored: 0,
    goalsConceded: 0,
    matches: 0
  });
}

/**
 * Process head-to-head match data
 */
function processHeadToHead(h2h: MatchData[], homeTeamId: number, awayTeamId: number) {
  const stats = {
    homeWins: 0,
    draws: 0,
    awayWins: 0,
    matches: h2h.length,
    homeWinRate: 0,
    drawRate: 0,
    awayWinRate: 0
  };
  
  h2h.forEach(match => {
    const homeScore = match.homeTeam.id === homeTeamId ? match.homeTeam.goals || 0 : match.awayTeam.goals || 0;
    const awayScore = match.awayTeam.id === awayTeamId ? match.awayTeam.goals || 0 : match.homeTeam.goals || 0;
    
    if (homeScore > awayScore) {
      stats.homeWins++;
    } else if (homeScore === awayScore) {
      stats.draws++;
    } else {
      stats.awayWins++;
    }
  });
  
  // Calculate win rates
  if (stats.matches > 0) {
    stats.homeWinRate = stats.homeWins / stats.matches;
    stats.drawRate = stats.draws / stats.matches;
    stats.awayWinRate = stats.awayWins / stats.matches;
  }
  
  return stats;
}

/**
 * Calculate base probability based on team form
 */
function calculateBaseProbability(teamForm: TeamForm, opponentForm: TeamForm, isHome: boolean): number {
  // Basic win rate
  let winRate = teamForm.matches > 0 ? (teamForm.wins / teamForm.matches) * 100 : 33.3;
  
  // Factor in team's attacking strength vs opponent's defensive weakness
  const attackingStrength = teamForm.matches > 0 ? teamForm.goalsScored / teamForm.matches : 1.2;
  const opponentDefensiveWeakness = opponentForm.matches > 0 ? opponentForm.goalsConceded / opponentForm.matches : 1.2;
  
  // Modify probability based on attacking/defensive metrics
  winRate *= (attackingStrength / 1.2) * (opponentDefensiveWeakness / 1.2);
  
  // Add home/away adjustment
  if (isHome) {
    winRate *= 1.2; 
  } else {
    winRate *= 0.8; 
  }
  
  return Math.min(85, winRate); 
}

/**
 * Apply recency bias to predictions (more recent matches matter more)
 */
function applyRecencyBias(
  match: MatchData, 
  homeForm: MatchData[], 
  awayForm: MatchData[],
  homeProbability: number,
  awayProbability: number
): void {
  // Implementation would weight recent form more heavily
  // This is a simplified version
  const recentHomeForm = homeForm.slice(0, 3);
  const recentAwayForm = awayForm.slice(0, 3);
  
  // Could adjust probabilities based on very recent form
  // Implementation would be more sophisticated in production
}

/**
 * Calculate probability of both teams to score
 */
function calculateBTTSProbability(homeForm: TeamForm, awayForm: TeamForm): number {
  // Calculate based on teams' scoring and conceding rates
  const homeScoresRate = homeForm.matches > 0 ? Math.min(100, (homeForm.goalsScored / homeForm.matches) * 70) : 60;
  const awayScoresRate = awayForm.matches > 0 ? Math.min(100, (awayForm.goalsScored / awayForm.matches) * 50) : 40;
  
  // Combined probability (simplified)
  return (homeScoresRate + awayScoresRate) / 2;
}

/**
 * Calculate probability of over 2.5 goals
 */
function calculateOver2_5Probability(homeForm: TeamForm, awayForm: TeamForm): number {
  // Calculate average goals in matches involving these teams
  const homeAvgGoals = homeForm.matches > 0 
    ? (homeForm.goalsScored + homeForm.goalsConceded) / homeForm.matches 
    : 2.5;
    
  const awayAvgGoals = awayForm.matches > 0 
    ? (awayForm.goalsScored + awayForm.goalsConceded) / awayForm.matches 
    : 2.5;
  
  // Combined average
  const expectedGoals = (homeAvgGoals + awayAvgGoals) / 2;
  
  // Convert to probability (simplified)
  return Math.min(100, Math.max(0, ((expectedGoals - 1.5) / 2.5) * 100 + 50));
}

/**
 * Calculate confidence level in prediction
 */
function calculateConfidenceLevel(homeFormMatches: number, awayFormMatches: number, h2hMatches: number): number {
  // More data = higher confidence
  let confidence = 50; 
  
  // Add confidence based on amount of data available
  confidence += Math.min(25, homeFormMatches * 2.5); 
  confidence += Math.min(25, awayFormMatches * 2.5); 
  confidence += Math.min(20, h2hMatches * 5); 
  
  // Cap at 95% - never perfect certainty
  return Math.min(95, confidence);
}

/**
 * Get value bet recommendation based on prediction vs market odds
 */
export function getValueBet(prediction: MatchPrediction, marketOdds: { home: number, draw: number, away: number }) {
  // Convert market odds to implied probabilities
  const homeImplied = (1 / marketOdds.home) * 100;
  const drawImplied = (1 / marketOdds.draw) * 100;
  const awayImplied = (1 / marketOdds.away) * 100;
  
  // Calculate value (predicted prob - implied prob)
  const homeValue = prediction.home - homeImplied;
  const drawValue = prediction.draw - drawImplied;
  const awayValue = prediction.away - awayImplied;
  
  // Find best value bet (minimum 5% edge and high confidence)
  if (homeValue > 5 && prediction.confidence > 70) {
    return { outcome: 'home', value: homeValue, odds: marketOdds.home };
  } else if (drawValue > 5 && prediction.confidence > 75) {
    return { outcome: 'draw', value: drawValue, odds: marketOdds.draw };
  } else if (awayValue > 5 && prediction.confidence > 70) {
    return { outcome: 'away', value: awayValue, odds: marketOdds.away };
  }
  
  return null; 
}
