import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AudioWaveform, Users, Shield, BarChart3 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Landing() {
  const { t } = useLanguage();

  const handleEnterSystem = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-8 md:mb-16">
          <div className="flex items-center justify-center mb-4 md:mb-6">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-primary rounded-2xl flex items-center justify-center">
              <AudioWaveform className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-3 md:mb-4 font-roboto">
            AudioSeg
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8 max-w-2xl mx-auto px-4">
            {t('welcomeMessage')}
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary-600 text-white px-8 py-3"
            onClick={handleEnterSystem}
          >
            {t('language') === 'pt' ? 'Explorar Sistema' : 'Explore System'}
          </Button>
          
          {/* Prototype notice */}
          <div className="mt-6 md:mt-8 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto mx-4">
            <p className="text-xs md:text-sm text-blue-800">
              <strong>Prototype Mode:</strong> This is a demonstration version of AudioSeg. 
              You can explore all features without authentication. Full user management will be available in the production version.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-16">
          <Card className="text-center p-3 md:p-6">
            <CardContent className="pt-3 md:pt-6">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3 md:mb-4">
                <AudioWaveform className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {t('language') === 'pt' ? 'Detecção Automática' : 'Automatic Detection'}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('language') === 'pt' 
                  ? 'Algoritmos avançados de análise prosódica identificam limites de frases usando pausas, alongamento e mudanças de tom'
                  : 'Advanced prosodic analysis algorithms identify sentence boundaries using pauses, lengthening and pitch changes'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-success-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {t('language') === 'pt' ? 'Validação Humana' : 'Human Validation'}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('language') === 'pt'
                  ? 'Interface intuitiva para revisão e correção de segmentos com controle de qualidade especializado'
                  : 'Intuitive interface for segment review and correction with specialized quality control'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-warning-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {t('language') === 'pt' ? 'Controle de Acesso' : 'Access Control'}
              </h3>
              <p className="text-gray-600 text-sm">
                {t('language') === 'pt'
                  ? 'Sistema de funções e permissões por idioma com gerenciamento avançado de usuários'
                  : 'Role and language-based permissions system with advanced user management'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        

        {/* Technical Approach */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>F-score {'>'} 0.90</span>
            </div>
            <div className="flex items-center space-x-2">
              <AudioWaveform className="w-4 h-4" />
              <span>Múltiplos formatos</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Validação especializada</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
