
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import OpenAI from "https://esm.sh/openai@4.28.0"

import { corsHeaders } from "./utils/cors.ts"
import { validateRequest } from "./utils/validation.ts"
import { transcribeAudio } from "./services/transcriptionService.ts"
import { generateSummary } from "./services/summaryService.ts"
import { generateFeedback } from "./services/feedbackService.ts"
import { 
  getCallData, 
  getExistingFeedback, 
  updateCallProcessing,
  updateCallError,
  updateCallWithTranscription,
  updateCallWithSummary,
  saveCompleteCall,
  updateCallWithResult,
  saveFeedback
} from "./services/databaseService.ts"

// Límite de tiempo máximo para evitar timeouts de la función
const MAX_PROCESSING_TIME = 25000; // 25 segundos

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const requestData = await req.json()
    const { callId, audioUrl, onlyFeedback } = validateRequest(requestData)
    
    console.log(`Procesando llamada ${callId} con URL: ${audioUrl}`)
    console.log(`¿Solo generar feedback? ${onlyFeedback ? 'Sí' : 'No'}`)
    
    // Inicializar OpenAI
    console.log("Inicializando cliente de OpenAI...")
    const openaiKey = Deno.env.get('API de OPENAI')
    
    if (!openaiKey) {
      throw new Error("API key de OpenAI no encontrada. Por favor configure la clave 'API de OPENAI' en las variables de entorno de Supabase.")
    }
    
    const openai = new OpenAI({
      apiKey: openaiKey
    })
    
    // Obtener datos de la llamada
    console.log("Obteniendo datos de la llamada...")
    const call = await getCallData(callId)
    console.log("Datos de la llamada obtenidos:", call)
    
    // If only feedback is required and feedback already exists
    if (onlyFeedback) {
      console.log("Generando solo feedback para la llamada...")
      
      // Verificar si ya existe feedback para esta llamada
      const existingFeedback = await getExistingFeedback(callId)
        
      if (existingFeedback) {
        console.log("Feedback ya existe para esta llamada:", existingFeedback)
        return new Response(
          JSON.stringify({ success: true, feedback: existingFeedback }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // If there's transcription, generate feedback
      if (call.transcription) {
        // Generate feedback
        const feedbackResult = await generateFeedback(openai, call)
        
        // Guardar feedback en la base de datos
        const { data: savedFeedback, error: feedbackError } = await saveFeedback(feedbackResult.feedback)
          
        if (feedbackError) {
          throw new Error(`Error al guardar el feedback: ${feedbackError.message}`)
        }
        
        // Actualizar la llamada con el resultado
        await updateCallWithResult(callId, feedbackResult.result, feedbackResult.product, feedbackResult.reason)
          
        return new Response(
          JSON.stringify({ 
            success: true, 
            feedback: savedFeedback,
            result: feedbackResult.result,
            product: feedbackResult.product,
            reason: feedbackResult.reason,
            status_summary: feedbackResult.reason
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        throw new Error("No hay transcripción disponible para generar feedback")
      }
    }
    
    // For full processing flow
    if (!call.transcription) {
      try {
        // Actualizar el estado de la llamada a "procesando"
        await updateCallProcessing(callId, 20)
          
        // Transcribir audio
        console.log("Comenzando transcripción con Whisper...")
        const transcription = await transcribeAudio(openai, audioUrl)
        console.log("Transcripción completada");
        
        // Actualizar progreso
        await updateCallWithTranscription(callId, transcription, 40)
        
        // Generate summary
        console.log("Generando resumen...")
        const summary = await generateSummary(openai, transcription)
        
        // Actualizar progreso
        await updateCallWithSummary(callId, summary, 70)
        
        // Generate feedback
        console.log("Generando feedback...")
        const feedbackResult = await generateFeedback(openai, {
          ...call,
          transcription: JSON.stringify(transcription),
          summary
        })
        
        // Calcular duración del audio basada en la transcripción
        const duration = transcription.length > 0 
          ? Math.ceil(transcription[transcription.length - 1].end)
          : 0
        
        // Actualizar llamada con toda la información
        console.log("Guardando resultados en la base de datos...")
        const { error: updateError } = await saveCompleteCall(
          callId, 
          transcription, 
          summary, 
          duration, 
          feedbackResult.result, 
          feedbackResult.product, 
          feedbackResult.reason
        )
          
        if (updateError) {
          throw new Error(`Error al actualizar la llamada: ${updateError.message}`)
        }
        
        // Guardar feedback en la base de datos
        try {
          const { error: feedbackError } = await saveFeedback(feedbackResult.feedback)
            
          if (feedbackError) {
            throw new Error(`Error al guardar el feedback: ${feedbackError.message}`)
          }
        } catch (error) {
          console.error("Error al parsear o guardar el feedback:", error)
        }
        
        return new Response(
          JSON.stringify({ 
            success: true,
            message: "Llamada procesada correctamente",
            data: {
              transcription,
              summary,
              feedback: feedbackResult.feedback,
              result: feedbackResult.result,
              product: feedbackResult.product,
              reason: feedbackResult.reason,
              status_summary: feedbackResult.reason
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (processingError) {
        console.error("Error en el procesamiento:", processingError);
        
        // Actualizar el estado a "error" pero permitir reintentos
        await updateCallError(callId);
          
        throw processingError;
      }
    } else {
      // If transcription exists but feedback needs generation
      const existingFeedback = await getExistingFeedback(callId)
      
      if (existingFeedback) {
        // Verificar si ya hay resultados
        if (!call.result) {
          // Generate only results
          const feedbackResult = await generateFeedback(openai, call)
          
          // Update the call with the results
          await updateCallWithResult(callId, feedbackResult.result, feedbackResult.product, feedbackResult.reason)
            
          return new Response(
            JSON.stringify({ 
              success: true,
              message: "Resultados actualizados",
              feedback: existingFeedback,
              result: feedbackResult.result,
              product: feedbackResult.product,
              reason: feedbackResult.reason,
              status_summary: feedbackResult.reason
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Feedback ya existente",
            feedback: existingFeedback,
            result: call.result,
            product: call.product,
            reason: call.reason,
            status_summary: call.reason
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Generate feedback and classification
      const feedbackResult = await generateFeedback(openai, call)
      
      // Save feedback
      const { data: savedFeedback, error: feedbackError } = await saveFeedback(feedbackResult.feedback)
        
      if (feedbackError) {
        throw new Error(`Error al guardar el feedback: ${feedbackError.message}`)
      }
      
      // Update the call with the results
      await updateCallWithResult(callId, feedbackResult.result, feedbackResult.product, feedbackResult.reason)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          feedback: savedFeedback,
          result: feedbackResult.result,
          product: feedbackResult.product,
          reason: feedbackResult.reason,
          status_summary: feedbackResult.reason
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error("Error procesando la llamada:", error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
