
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, TrendingUp, BarChart3, Users, Clock, Star } from "lucide-react";

interface QuickQuestionsProps {
  onQuestionSelect: (question: string) => void;
  isLoading: boolean;
}

const quickQuestions = [
  {
    id: 1,
    icon: TrendingUp,
    question: "¿Cuáles son las tendencias de resultados de llamadas este mes?",
    category: "Tendencias"
  },
  {
    id: 2,
    icon: BarChart3,
    question: "¿Cuál es el promedio de puntuación de las llamadas?",
    category: "Métricas"
  },
  {
    id: 3,
    icon: Users,
    question: "¿Qué agentes tienen mejor rendimiento?",
    category: "Rendimiento"
  },
  {
    id: 4,
    icon: Clock,
    question: "¿Cuál es la duración promedio de las llamadas?",
    category: "Duración"
  },
  {
    id: 5,
    icon: Star,
    question: "¿Cuáles son los principales aspectos positivos identificados?",
    category: "Feedback"
  },
  {
    id: 6,
    icon: MessageSquare,
    question: "¿Cuáles son los temas más frecuentes en las llamadas?",
    category: "Contenido"
  }
];

export default function QuickQuestions({ onQuestionSelect, isLoading }: QuickQuestionsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground px-2">Preguntas rápidas</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {quickQuestions.map((item) => {
          const IconComponent = item.icon;
          return (
            <Card 
              key={item.id}
              className="hover:bg-accent/50 transition-colors cursor-pointer border-dashed"
              onClick={() => !isLoading && onQuestionSelect(item.question)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <IconComponent className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {item.category}
                    </p>
                    <p className="text-sm leading-tight break-words">
                      {item.question}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
