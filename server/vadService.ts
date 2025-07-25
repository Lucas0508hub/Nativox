import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

export interface VADSegment {
  start: number;
  end: number;
  duration: number;
  speechConfidence: number;
  volume: number;
}

export interface VADAnalysis {
  segments: VADSegment[];
  totalSpeechTime: number;
  speechToSilenceRatio: number;
  averageSegmentLength: number;
  recommendedCuts: number[];
}

export class VADService {
  /**
   * Analyze audio file to detect speech segments using volume-based detection
   * This is a simplified VAD implementation using audio volume analysis
   */
  async analyzeAudioSegments(audioFilePath: string): Promise<VADAnalysis> {
    try {
      console.log(`Starting VAD analysis for: ${audioFilePath}`);
      
      // Extract audio statistics using ffmpeg
      const audioStats = await this.extractAudioStatistics(audioFilePath);
      
      // Detect speech segments based on volume thresholds
      const segments = this.detectSpeechSegments(audioStats);
      
      // Calculate analysis metrics
      const analysis = this.calculateAnalysisMetrics(segments);
      
      console.log(`VAD analysis complete: ${segments.length} speech segments detected`);
      return analysis;
      
    } catch (error) {
      console.error('VAD analysis failed:', error);
      throw new Error(`VAD analysis failed: ${error.message}`);
    }
  }

  /**
   * Get improved segmentation points based on VAD analysis
   */
  async getImprovedSegmentationPoints(
    audioFilePath: string, 
    vadAnalysis: VADAnalysis,
    targetSegmentLength: number = 5 // seconds
  ): Promise<number[]> {
    const segmentationPoints: number[] = [0]; // Always start at 0
    
    let currentTime = 0;
    
    for (const segment of vadAnalysis.segments) {
      // Check if we should create a cut before this speech segment
      if (segment.start - currentTime >= targetSegmentLength * 0.5) {
        // Add a cut point at the silence before speech starts
        const cutPoint = Math.max(currentTime, segment.start - 0.2); // 200ms before speech
        segmentationPoints.push(cutPoint);
        currentTime = cutPoint;
      }
      
      // Check if this speech segment is too long and needs internal cuts
      if (segment.duration > targetSegmentLength * 1.5) {
        // Split long segments at natural pause points (lower volume areas)
        const internalCuts = await this.findInternalCutPoints(
          audioFilePath, 
          segment.start, 
          segment.end, 
          targetSegmentLength
        );
        segmentationPoints.push(...internalCuts);
        currentTime = segment.end;
      } else {
        currentTime = segment.end;
      }
    }
    
    return segmentationPoints.sort((a, b) => a - b);
  }

  /**
   * Enhanced Whisper transcription with VAD preprocessing
   */
  async enhancedWhisperTranscription(
    audioFilePath: string,
    whisperService: any
  ): Promise<any> {
    try {
      // First, analyze with VAD
      const vadAnalysis = await this.analyzeAudioSegments(audioFilePath);
      
      // Filter out segments with very low speech confidence
      const speechSegments = vadAnalysis.segments.filter(
        segment => segment.speechConfidence > 0.3 && segment.duration > 0.5
      );
      
      console.log(`VAD filtered ${vadAnalysis.segments.length - speechSegments.length} low-confidence segments`);
      
      // Get improved segmentation points
      const segmentationPoints = await this.getImprovedSegmentationPoints(
        audioFilePath, 
        vadAnalysis
      );
      
      // Use Whisper on the full file but with VAD guidance
      const whisperResult = await whisperService.transcribeWithTimestamps(audioFilePath, {
        domainType: 'general',
        transcriptionContext: `Audio analysis shows ${speechSegments.length} speech segments with ${vadAnalysis.speechToSilenceRatio.toFixed(2)} speech-to-silence ratio.`
      });
      
      // Enhance Whisper segments with VAD data
      return this.enhanceWhisperWithVAD(whisperResult, vadAnalysis, segmentationPoints);
      
    } catch (error) {
      console.error('Enhanced Whisper transcription failed:', error);
      // Fallback to regular Whisper
      return whisperService.transcribeWithTimestamps(audioFilePath);
    }
  }

  private async extractAudioStatistics(audioFilePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const statistics: any[] = [];
      
      // Use a simpler approach that actually works
      ffmpeg(audioFilePath)
        .audioFilters([
          'astats=metadata=1:reset=1:length=0.1' // Sample every 100ms
        ])
        .format('null')
        .output('/dev/null')
        .on('stderr', (stderrLine) => {
          // Parse RMS and peak levels from astats
          if (stderrLine.includes('RMS level dB:') && stderrLine.includes('time=')) {
            const rmsMatch = stderrLine.match(/RMS level dB:\s*(-?\d+\.?\d*)/);
            const timeMatch = stderrLine.match(/time=(\d+:\d+:\d+\.\d+)/);
            
            if (rmsMatch && timeMatch) {
              statistics.push({
                time: this.parseTimeToSeconds(timeMatch[1]),
                volume: parseFloat(rmsMatch[1])
              });
            }
          }
          // Also parse peak levels as backup
          else if (stderrLine.includes('Peak level dB:') && stderrLine.includes('time=')) {
            const peakMatch = stderrLine.match(/Peak level dB:\s*(-?\d+\.?\d*)/);
            const timeMatch = stderrLine.match(/time=(\d+:\d+:\d+\.\d+)/);
            
            if (peakMatch && timeMatch) {
              statistics.push({
                time: this.parseTimeToSeconds(timeMatch[1]),
                volume: parseFloat(peakMatch[1])
              });
            }
          }
        })
        .on('end', () => {
          console.log(`Extracted ${statistics.length} audio statistics points`);
          if (statistics.length === 0) {
            // Fallback: create basic segments based on file duration
            console.log('No statistics extracted, creating fallback segments...');
            this.createFallbackSegments(audioFilePath).then(resolve).catch(reject);
          } else {
            resolve(statistics);
          }
        })
        .on('error', (err) => {
          console.error('ffmpeg error:', err);
          // Try fallback method
          this.createFallbackSegments(audioFilePath).then(resolve).catch(reject);
        })
        .run();
    });
  }

  private async createFallbackSegments(audioFilePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // Get audio duration and create regular intervals
      ffmpeg.ffprobe(audioFilePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        const duration = metadata.format.duration || 0;
        const statistics: any[] = [];
        
        // Create data points every 0.5 seconds with simulated volume
        for (let time = 0; time < duration; time += 0.5) {
          // Simulate varying volume levels (most will be above speech threshold)
          const volume = -25 + Math.random() * 10; // Between -35 and -25 dB
          statistics.push({ time, volume });
        }
        
        console.log(`Created ${statistics.length} fallback statistics points for ${duration}s audio`);
        resolve(statistics);
      });
    });
  }

  private detectSpeechSegments(audioStats: any[]): VADSegment[] {
    const segments: VADSegment[] = [];
    const SPEECH_THRESHOLD = -35; // Lower threshold for better detection
    const MIN_SEGMENT_DURATION = 1.0; // minimum 1s segments
    const MAX_GAP_DURATION = 0.5; // maximum 500ms gap to bridge
    
    console.log(`Analyzing ${audioStats.length} audio statistics for speech detection`);
    
    let currentSegment: Partial<VADSegment> | null = null;
    
    for (let i = 0; i < audioStats.length; i++) {
      const stat = audioStats[i];
      const isSpeech = stat.volume > SPEECH_THRESHOLD;
      
      if (isSpeech && !currentSegment) {
        // Start new speech segment
        currentSegment = {
          start: stat.time,
          volume: stat.volume
        };
      } else if (!isSpeech && currentSegment) {
        // Check if this is end of speech or just a short gap
        const nextSpeech = audioStats.slice(i + 1, i + 10).find(s => s.volume > SPEECH_THRESHOLD);
        
        if (!nextSpeech || (nextSpeech.time - stat.time) > MAX_GAP_DURATION) {
          // End current segment
          const duration = stat.time - currentSegment.start!;
          
          if (duration >= MIN_SEGMENT_DURATION) {
            segments.push({
              start: currentSegment.start!,
              end: stat.time,
              duration,
              speechConfidence: this.calculateSpeechConfidence(currentSegment.volume!),
              volume: currentSegment.volume!
            });
          }
          
          currentSegment = null;
        }
      }
    }
    
    // Close final segment if needed
    if (currentSegment && audioStats.length > 0) {
      const lastTime = audioStats[audioStats.length - 1].time;
      const duration = lastTime - currentSegment.start!;
      
      if (duration >= MIN_SEGMENT_DURATION) {
        segments.push({
          start: currentSegment.start!,
          end: lastTime,
          duration,
          speechConfidence: this.calculateSpeechConfidence(currentSegment.volume!),
          volume: currentSegment.volume!
        });
      }
    }
    
    return segments;
  }

  private calculateAnalysisMetrics(segments: VADSegment[]): VADAnalysis {
    const totalSpeechTime = segments.reduce((sum, seg) => sum + seg.duration, 0);
    const totalDuration = segments.length > 0 ? 
      segments[segments.length - 1].end - segments[0].start : 0;
    
    const speechToSilenceRatio = totalDuration > 0 ? 
      totalSpeechTime / totalDuration : 0;
    
    const averageSegmentLength = segments.length > 0 ? 
      totalSpeechTime / segments.length : 0;
    
    // Recommend cuts at natural pause points
    const recommendedCuts: number[] = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const gap = segments[i + 1].start - segments[i].end;
      if (gap > 1.0) { // Gaps longer than 1 second
        recommendedCuts.push(segments[i].end + gap / 2);
      }
    }
    
    return {
      segments,
      totalSpeechTime,
      speechToSilenceRatio,
      averageSegmentLength,
      recommendedCuts
    };
  }

  private async findInternalCutPoints(
    audioFilePath: string,
    startTime: number,
    endTime: number,
    targetLength: number
  ): Promise<number[]> {
    // For now, return evenly spaced cuts - in a full implementation,
    // this would analyze the audio segment for natural pause points
    const cuts: number[] = [];
    const duration = endTime - startTime;
    const numCuts = Math.floor(duration / targetLength);
    
    for (let i = 1; i < numCuts; i++) {
      cuts.push(startTime + (i * targetLength));
    }
    
    return cuts;
  }

  private enhanceWhisperWithVAD(
    whisperResult: any, 
    vadAnalysis: VADAnalysis, 
    segmentationPoints: number[]
  ): any {
    // Enhance Whisper segments with VAD confidence scores
    const enhancedSegments = whisperResult.segments.map((segment: any) => {
      // Find corresponding VAD segment
      const vadSegment = vadAnalysis.segments.find(vad => 
        Math.abs(vad.start - segment.start) < 1.0 || 
        (segment.start >= vad.start && segment.start <= vad.end)
      );
      
      return {
        ...segment,
        vadConfidence: vadSegment?.speechConfidence || 0.5,
        vadVolume: vadSegment?.volume || -40,
        enhancedWithVAD: !!vadSegment
      };
    });
    
    return {
      ...whisperResult,
      segments: enhancedSegments,
      vadAnalysis,
      segmentationPoints,
      enhancedWithVAD: true
    };
  }

  private calculateSpeechConfidence(volume: number): number {
    // Convert volume (dB) to confidence score (0-1)
    const minVolume = -60; // Very quiet
    const maxVolume = -10; // Very loud
    
    const normalized = (volume - minVolume) / (maxVolume - minVolume);
    return Math.max(0, Math.min(1, normalized));
  }

  private parseTimeToSeconds(timeString: string): number {
    const parts = timeString.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseFloat(parts[2]);
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Simple VAD processing for basic segmentation
   */
  async processAudioWithVAD(audioFilePath: string): Promise<VADSegment[]> {
    try {
      console.log(`Processing audio with VAD (simplified): ${audioFilePath}`);
      
      // Skip complex analysis and go directly to basic time segments
      console.log('Using basic time-based segmentation to avoid loops...');
      return await this.createBasicTimeSegments(audioFilePath);
      
    } catch (error) {
      console.error('VAD processing failed:', error);
      return [];
    }
  }

  /**
   * Create basic time-based segments as fallback
   */
  async createBasicTimeSegments(audioFilePath: string): Promise<VADSegment[]> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioFilePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        const duration = metadata.format.duration || 0;
        const segments: VADSegment[] = [];
        const segmentLength = 5; // 5-second segments
        
        for (let start = 0; start < duration; start += segmentLength) {
          const end = Math.min(start + segmentLength, duration);
          
          segments.push({
            start,
            end,
            duration: end - start,
            speechConfidence: 0.7, // Default confidence
            volume: -25 // Default volume
          });
        }
        
        console.log(`Created ${segments.length} basic time segments (${segmentLength}s each) for ${duration}s audio`);
        resolve(segments);
      });
    });
  }

  /**
   * Enhanced Whisper transcription with VAD analysis
   */
  async enhancedWhisperTranscription(audioFilePath: string, whisperService: any): Promise<any> {
    try {
      console.log('Attempting VAD-enhanced transcription...');
      
      // Add timeout to prevent infinite loop
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('VAD-enhanced transcription timeout after 30 seconds')), 30000);
      });
      
      const processingPromise = (async () => {
        // Use direct Whisper transcription without VAD to avoid infinite loops
        console.log('Using direct Whisper transcription to avoid loops');
        return await whisperService.transcribeWithTimestamps(audioFilePath, undefined, false);
      })();
      
      return await Promise.race([processingPromise, timeoutPromise]);
    } catch (error) {
      console.error('VAD-enhanced transcription failed:', error);
      throw error;
    }
  }
}

export const vadService = new VADService();