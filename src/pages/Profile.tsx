// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, User, Shield, Star, Settings, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserRankings } from "@/components/UserRankings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FavoritesTab } from "@/components/FavoritesTab";
import { PredictionHistory } from "@/components/PredictionHistory";
import PredictionTracking from "@/components/PredictionTracking";

// Using Profile interface from react-app-env.d.ts
const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/auth");
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setProfile(data);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error in getProfile:', error);
        setLoading(false);
      }
    };
    
    getProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <header className="glass sticky top-0 z-50 p-4 mb-6">
        <div className="container mx-auto">
          <h1 className="text-xl font-semibold">Perfil</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-8 space-y-6">
        <div className="glass rounded-lg p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username || ''}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{profile?.full_name}</h2>
              <p className="text-sm text-muted-foreground">@{profile?.username}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Estatísticas
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Favoritos
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats">
            <UserRankings />
            <PredictionTracking />
          </TabsContent>
          
          <TabsContent value="favorites">
            <FavoritesTab />
          </TabsContent>
          
          <TabsContent value="history">
            <PredictionHistory />
          </TabsContent>
        </Tabs>

        <div className="glass rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Configurações</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <span>Notificações</span>
              </div>
              <button 
                onClick={() => navigate('/settings')} 
                className="text-sm text-primary"
              >
                Configurar
              </button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-primary" />
                <span>Preferências</span>
              </div>
              <button 
                onClick={() => navigate('/settings')} 
                className="text-sm text-primary"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile;
