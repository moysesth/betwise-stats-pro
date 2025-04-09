// @ts-nocheck
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatISO } from "date-fns";

// Define the form schema with Zod
const formSchema = z.object({
  prediction: z.enum(["home", "draw", "away"], {
    required_error: "Selecione sua previsão.",
  }),
  odds: z
    .string()
    .min(1, { message: "Insira as odds." })
    .transform((val) => parseFloat(val.replace(",", "."))),
  stake: z
    .string()
    .min(1, { message: "Insira o valor apostado." })
    .transform((val) => parseFloat(val.replace(",", "."))),
});

interface PredictionFormProps {
  match: {
    fixture: {
      id: string;
      date: string;
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
    league: {
      name: string;
    };
    prediction?: {
      home: number;
      draw: number;
      away: number;
    };
    odds?: {
      home: number;
      draw: number;
      away: number;
    };
  };
  onSuccess?: () => void;
}

const PredictionForm = ({ match, onSuccess }: PredictionFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Initialize form with react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prediction: undefined,
      odds: 0,
      stake: 0,
    },
  });

  // Create mutation for submitting prediction
  const createPrediction = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Você precisa estar logado para registrar previsões");
      }

      const { data, error } = await supabase
        .from("user_predictions")
        .insert({
          user_id: session.user.id,
          match_id: match.fixture.id,
          prediction: values.prediction,
          odds: values.odds,
          stake: values.stake,
          result: "pending",
          match_date: match.fixture.date,
          home_team: match.teams.home.name,
          away_team: match.teams.away.name,
          league: match.league.name,
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Você já registrou uma previsão para esta partida");
        }
        throw new Error("Erro ao registrar previsão: " + error.message);
      }

      return data;
    },
    onSuccess: () => {
      // Reset form and close dialog
      form.reset();
      setIsOpen(false);
      
      // Show success toast
      toast({
        title: "Previsão registrada!",
        description: "Sua previsão foi registrada com sucesso.",
      });
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["user-predictions"] });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createPrediction.mutate(values);
  };

  // Auto-fill odds when prediction is selected
  const handlePredictionChange = (value: string) => {
    if (match.odds) {
      if (value === "home") {
        form.setValue("odds", match.odds.home.toString());
      } else if (value === "draw") {
        form.setValue("odds", match.odds.draw.toString());
      } else if (value === "away") {
        form.setValue("odds", match.odds.away.toString());
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          Registrar Previsão
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Previsão</DialogTitle>
          <DialogDescription>
            {match.teams.home.name} vs {match.teams.away.name}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="prediction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu palpite</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handlePredictionChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o resultado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="home">
                        {match.teams.home.name} (Casa)
                        {match.prediction && (
                          <span className="ml-2 text-xs">
                            ({match.prediction.home}%)
                          </span>
                        )}
                      </SelectItem>
                      <SelectItem value="draw">
                        Empate
                        {match.prediction && (
                          <span className="ml-2 text-xs">
                            ({match.prediction.draw}%)
                          </span>
                        )}
                      </SelectItem>
                      <SelectItem value="away">
                        {match.teams.away.name} (Fora)
                        {match.prediction && (
                          <span className="ml-2 text-xs">
                            ({match.prediction.away}%)
                          </span>
                        )}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="odds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Odds</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1.90"
                      {...field}
                      type="text"
                      inputMode="decimal"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="stake"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor apostado (R$)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="50.00"
                      {...field}
                      type="text"
                      inputMode="decimal"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit" disabled={createPrediction.isPending}>
                {createPrediction.isPending ? "Registrando..." : "Registrar Previsão"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PredictionForm;
