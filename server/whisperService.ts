import OpenAI from 'openai';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { vadService, type VADAnalysis } from './vadService';

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set. Please configure it to use Whisper transcription.');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface WhisperResponse {
  task: string;
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
}

export interface TranscriptionContext {
  transcriptionContext?: string;
  domainType?: string;
  languageCode?: string;
  examples?: Array<{ description: string; transcription: string }>;
}

export class WhisperService {
  async transcribeWithTimestamps(
    audioFilePath: string,
    contextOptions?: TranscriptionContext,
    useVAD: boolean = true
  ): Promise<WhisperResponse> {
    try {
      console.log(`Starting Whisper transcription for: ${audioFilePath}${useVAD ? ' with VAD' : ' direct'}`);
      
      // Try VAD-enhanced transcription first
      if (useVAD) {
        try {
          console.log('Attempting VAD-enhanced transcription...');
          return await vadService.enhancedWhisperTranscription(audioFilePath, this);
        } catch (vadError) {
          console.warn('VAD enhancement failed, falling back to standard Whisper:', vadError.message);
        }
      }
      
      // Build context prompt for better transcription
      let contextPrompt = "";
      
      if (contextOptions?.transcriptionContext) {
        contextPrompt += contextOptions.transcriptionContext + "\n\n";
      }
      
      if (contextOptions?.domainType) {
        contextPrompt += `This is a ${contextOptions.domainType} audio recording. `;
        
        // Add domain-specific guidance
        const domainGuidance = this.getDomainGuidance(contextOptions.domainType);
        if (domainGuidance) {
          contextPrompt += domainGuidance + "\n\n";
        }
      }
      
      if (contextOptions?.examples && contextOptions.examples.length > 0) {
        contextPrompt += "Transcription examples:\n";
        contextOptions.examples.forEach((example, index) => {
          contextPrompt += `Example ${index + 1}: "${example.description}" -> "${example.transcription}"\n`;
        });
        contextPrompt += "\n";
      }
      
      console.log("Using context prompt:", contextPrompt ? "Yes" : "No");
      
      const transcription = await getOpenAIClient().audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: "whisper-1",
        task: "transcribe", // Auto-detect language instead of forcing
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
        prompt: contextPrompt.trim() || undefined
        // Remove language parameter to allow auto-detection
      });

      console.log(`Whisper transcription completed. Segments: ${transcription.segments?.length || 0}`);
      
      return transcription as WhisperResponse;
    } catch (error) {
      console.error('Whisper API error:', error);
      throw new Error(`Falha na transcrição: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private getDomainGuidance(domainType: string): string {
    const domainGuidanceMap: Record<string, string> = {
      medical: "Use proper medical terminology and abbreviations. Common terms: mg (milligrams), ml (milliliters), BP (blood pressure), HR (heart rate), etc.",
      legal: "Use proper legal terminology and formal language. Common terms: defendant, plaintiff, jurisdiction, litigation, etc.",
      business: "Use business terminology and acronyms. Common terms: KPI, ROI, B2B, B2C, Q1/Q2/Q3/Q4, YoY, etc.",
      educational: "Use educational and academic terminology. Common terms: curriculum, assessment, pedagogy, etc.",
      technical: "Use technical terminology and abbreviations. Common terms: API, SDK, UI/UX, database, server, etc.",
      religious: "Use appropriate religious terminology and respectful language. Common terms: scripture, prayer, congregation, worship, etc."
    };
    
    return domainGuidanceMap[domainType] || "";
  }

  // Converte segmentos do Whisper para o formato do AudioSeg
  convertWhisperSegments(whisperResponse: WhisperResponse, projectId: number) {
    const segments = whisperResponse.segments || [];
    
    // Ensure we get the complete audio duration
    const totalDuration = whisperResponse.duration || 0;
    const lastSegmentEnd = segments.length > 0 ? segments[segments.length - 1].end : 0;
    
    console.log(`Converting ${segments.length} Whisper segments. Audio duration: ${totalDuration}s, Last segment ends at: ${lastSegmentEnd}s`);
    
    // Check if there's a gap at the end (last minute issue)
    if (totalDuration > lastSegmentEnd + 10) {
      console.log(`Warning: Potential missing segment at end. Gap of ${totalDuration - lastSegmentEnd}s detected`);
      
      // Add a final segment to cover the gap
      segments.push({
        id: segments.length,
        seek: 0,
        start: lastSegmentEnd,
        end: totalDuration,
        text: "[Missing audio segment - please review]",
        tokens: [],
        temperature: 0,
        avg_logprob: -1,
        compression_ratio: 1,
        no_speech_prob: 0.5
      });
      
      console.log(`Added final segment: ${lastSegmentEnd}s - ${totalDuration}s`);
    }
    
    return segments.map((segment, index) => ({
      projectId,
      segmentNumber: index + 1,
      startTime: Math.round(segment.start * 1000) / 1000, // Arredondar para 3 casas decimais
      endTime: Math.round(segment.end * 1000) / 1000,
      transcription: segment.text.trim(),
      isValidated: false,
      isApproved: false,
      confidence: 1 - segment.no_speech_prob, // Confiança baseada na probabilidade de não-fala
      processingMethod: 'whisper'
    }));
  }

  // Detecta idioma do áudio
  async detectLanguage(audioFilePath: string): Promise<string> {
    try {
      // Usa apenas os primeiros 30 segundos para detecção rápida
      const transcription = await getOpenAIClient().audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: "whisper-1",
        response_format: "verbose_json"
      });

      return transcription.language || 'pt';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'pt'; // Fallback para português
    }
  }

  // Verifica se o arquivo é adequado para processamento
  isAudioFileValid(filePath: string): boolean {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`Arquivo não encontrado: ${filePath}`);
        return false;
      }

      const stats = fs.statSync(filePath);
      const maxSize = 25 * 1024 * 1024; // 25MB limit do Whisper API
      
      console.log(`Validando arquivo: ${filePath}, tamanho: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
      
      if (stats.size > maxSize) {
        console.warn(`Arquivo muito grande para Whisper: ${(stats.size / 1024 / 1024).toFixed(2)}MB > 25MB`);
        return false;
      }

      const ext = path.extname(filePath).toLowerCase();
      const supportedFormats = ['.mp3', '.wav', '.m4a', '.flac', '.webm'];
      
      const isValidFormat = supportedFormats.includes(ext);
      if (!isValidFormat) {
        console.warn(`Formato não suportado: ${ext}`);
      }
      
      console.log(`Arquivo válido para Whisper: ${isValidFormat && stats.size <= maxSize}`);
      return isValidFormat;
    } catch (error) {
      console.error('Erro ao validar arquivo:', error);
      return false;
    }
  }
}

export const whisperService = new WhisperService();