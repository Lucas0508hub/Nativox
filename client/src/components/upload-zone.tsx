import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  File, 
  CheckCircle, 
  AlertCircle, 
  X,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  selectedFile?: File | null;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string;
  accept?: string;
  maxSize?: number; // in bytes
  className?: string;
}

export function UploadZone({
  onFileSelect,
  onFileRemove,
  selectedFile,
  isUploading = false,
  uploadProgress = 0,
  error,
  accept = ".wav,.mp3,.m4a,audio/*",
  maxSize = 500 * 1024 * 1024, // 500MB
  className = ""
}: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0] && !isUploading) {
      handleFileValidation(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && !isUploading) {
      handleFileValidation(e.target.files[0]);
    }
  };

  const handleFileValidation = (file: File) => {
    // Check file size
    if (file.size > maxSize) {
      return; // Let parent component handle error
    }

    // Check file type
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a'];
    const isValidType = validTypes.includes(file.type) || 
                       file.name.toLowerCase().endsWith('.wav') ||
                       file.name.toLowerCase().endsWith('.mp3') ||
                       file.name.toLowerCase().endsWith('.m4a');

    if (!isValidType) {
      return; // Let parent component handle error
    }

    onFileSelect(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (filename: string) => {
    const extension = filename.toLowerCase().split('.').pop();
    switch (extension) {
      case 'wav':
        return '🎵';
      case 'mp3':
        return '🎶';
      case 'm4a':
        return '🎼';
      default:
        return '🎤';
    }
  };

  return (
    <Card className={cn("border-2 border-dashed transition-all duration-200", className)}>
      <CardContent className="p-6">
        {selectedFile ? (
          <div className="space-y-4">
            {/* Selected File Display */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {getFileTypeIcon(selectedFile.name)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 truncate max-w-xs">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-success-500" />
                    {onFileRemove && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onFileRemove}
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Enviando arquivo...</span>
                  <span className="text-gray-600">{uploadProgress.toFixed(0)}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        ) : (
          /* Upload Zone */
          <div
            className={cn(
              "upload-zone rounded-lg p-8 text-center border-2 border-dashed transition-all cursor-pointer",
              dragActive && "dragover",
              isUploading && "pointer-events-none opacity-50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Arraste um arquivo de áudio aqui
            </h3>
            <p className="text-gray-500 mb-4">
              ou clique para selecionar um arquivo
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Formatos suportados: WAV, MP3, M4A
            </p>
            <p className="text-xs text-gray-400">
              Tamanho máximo: {formatFileSize(maxSize)}
            </p>
            
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleFileInput}
              disabled={isUploading}
            />
          </div>
        )}

        {/* File Requirements */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Requisitos para Melhor Segmentação
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• <strong>Qualidade:</strong> Prefira arquivos WAV não comprimidos</li>
            <li>• <strong>Sample Rate:</strong> Mínimo de 16kHz, recomendado 44.1kHz ou superior</li>
            <li>• <strong>Ruído de fundo:</strong> Minimize para melhor detecção prosódica</li>
            <li>• <strong>Fala clara:</strong> Evite sobreposição de vozes durante segmentação</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
