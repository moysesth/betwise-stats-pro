// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const oddsApiKey = Deno.env.get('ODDS_API_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface OddsResponse {
  success: boolean;
  data: {
    id: string;
    sport_key: string;
    sport_title: string;
    commence_time: string;
    home_team: string;
    away_team: string;
    bookmakers: Array<{
      key: string;
      title: string;
      last_update: string;
      markets: Array<{
        key: string;
        outcomes: Array<{
          name: string;
          price: number;
        }>;
      }>;
    }>;
  }[];
}

serve(async (req) => {
  try {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        status: 204,
      });
    }

    // Parse request body
    const { endpoint, params, fixtureIds } = await req.json();

    // Handle different endpoints
    if (endpoint === 'odds') {
      // Default parameters
      const sport = params?.sport || 'soccer';
      const regions = params?.regions || 'eu';
      const markets = params?.markets || 'h2h';

      // Fetch odds from The Odds API
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${oddsApiKey}&regions=${regions}&markets=${markets}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch odds: ${response.statusText}`);
      }
      
      const data: OddsResponse = await response.json();
      
      // Store odds in Supabase
      if (data.success !== false && data.data) {
        const oddsData = data.data.map(match => {
          // Find the average odds across all bookmakers
          const bookmakers = match.bookmakers;
          
          if (!bookmakers || bookmakers.length === 0) {
            return null;
          }
          
          // Get h2h market (1x2 odds)
          const h2hMarket = bookmakers[0]?.markets?.find(m => m.key === 'h2h');
          
          if (!h2hMarket) {
            return null;
          }
          
          // Map outcome names to home, draw, away
          const homeOdds = h2hMarket.outcomes.find(o => o.name === match.home_team)?.price || 0;
          const drawOdds = h2hMarket.outcomes.find(o => o.name === 'Draw')?.price || 0;
          const awayOdds = h2hMarket.outcomes.find(o => o.name === match.away_team)?.price || 0;
          
          return {
            match_id: match.id,
            bookmaker: bookmakers[0].key,
            home_odds: homeOdds,
            draw_odds: drawOdds,
            away_odds: awayOdds,
            created_at: new Date().toISOString()
          };
        }).filter(Boolean);
        
        // Insert or update odds in database
        if (oddsData.length > 0) {
          const { error } = await supabase
            .from('match_odds')
            .upsert(oddsData, { onConflict: 'match_id,bookmaker' });
            
          if (error) {
            throw new Error(`Failed to store odds: ${error.message}`);
          }
        }
      }
      
      return new Response(JSON.stringify({ success: true, data: data.data }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } 
    else if (endpoint === 'match-odds') {
      // Validate fixture IDs
      if (!fixtureIds || !Array.isArray(fixtureIds) || fixtureIds.length === 0) {
        throw new Error('Missing or invalid fixture IDs');
      }
      
      // Fetch odds for specific matches
      const { data, error } = await supabase
        .from('match_odds')
        .select('*')
        .in('match_id', fixtureIds);
        
      if (error) {
        throw new Error(`Failed to fetch match odds: ${error.message}`);
      }
      
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    else if (endpoint === 'update-predictions') {
      // This endpoint would be triggered via webhook when matches are complete
      // It updates user predictions with results
      
      // Get completed matches
      const completedMatches = params?.matches || [];
      
      for (const match of completedMatches) {
        const matchId = match.fixture.id.toString();
        const homeScore = match.goals.home;
        const awayScore = match.goals.away;
        
        // Determine match result
        let result = 'draw';
        if (homeScore > awayScore) {
          result = 'home';
        } else if (homeScore < awayScore) {
          result = 'away';
        }
        
        // Update user predictions
        const { data: predictions, error: fetchError } = await supabase
          .from('user_predictions')
          .select('id, prediction')
          .eq('match_id', matchId)
          .eq('result', 'pending');
          
        if (fetchError) {
          console.error(`Failed to fetch predictions for match ${matchId}: ${fetchError.message}`);
          continue;
        }
        
        // Update each prediction with result
        for (const prediction of predictions || []) {
          const predictionResult = prediction.prediction === result ? 'win' : 'loss';
          
          const { error: updateError } = await supabase
            .from('user_predictions')
            .update({
              result: predictionResult,
              final_score: { home: homeScore, away: awayScore }
            })
            .eq('id', prediction.id);
            
          if (updateError) {
            console.error(`Failed to update prediction ${prediction.id}: ${updateError.message}`);
          }
        }
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Handle unknown endpoint
    return new Response(JSON.stringify({ error: 'Unknown endpoint' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  } catch (error) {
    // Handle errors
    console.error('Error in odds-api function:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
