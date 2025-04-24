
/**
 * Hook para obtener el prompt activo de un tipo.
 * Este hook puede usarse dentro de summaryService.ts o feedbackService.ts
 * y hace fallback al prompt codificado si no hay uno activo en la DB.
 */
import { usePrompts, PromptType } from "./usePrompts";

export function usePromptLoader(type: PromptType, fallback: string) {
  const { activePrompt } = usePrompts(type);

  return activePrompt?.content || fallback;
}
