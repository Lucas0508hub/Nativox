import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from '../lib/i18n';
import { 
  BookOpen, 
  Feather, 
  Heart, 
  Scale, 
  GraduationCap, 
  Mail, 
  Gavel, 
  Scroll, 
  MoreHorizontal,
  X
} from 'lucide-react';

export interface GenreOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface GenreSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (genre: string) => void;
  currentGenre?: string;
}

const GenreSelectionModal: React.FC<GenreSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentGenre
}) => {
  const { t } = useLanguage();
  const [selectedGenre, setSelectedGenre] = useState<string>(currentGenre || '');

  const genreOptions: GenreOption[] = [
    {
      id: 'narrative',
      name: t('narrative'),
      description: t('narrativeDescription'),
      icon: <BookOpen className="w-5 h-5" />
    },
    {
      id: 'poetry',
      name: t('poetry'),
      description: t('poetryDescription'),
      icon: <Feather className="w-5 h-5" />
    },
    {
      id: 'poetic',
      name: t('poetic'),
      description: t('poeticDescription'),
      icon: <Heart className="w-5 h-5" />
    },
    {
      id: 'legalSystem',
      name: t('legalSystem'),
      description: t('legalSystemDescription'),
      icon: <Scale className="w-5 h-5" />
    },
    {
      id: 'instruction',
      name: t('instruction'),
      description: t('instructionDescription'),
      icon: <GraduationCap className="w-5 h-5" />
    },
    {
      id: 'letters',
      name: t('letters'),
      description: t('lettersDescription'),
      icon: <Mail className="w-5 h-5" />
    },
    {
      id: 'judgment',
      name: t('judgment'),
      description: t('judgmentDescription'),
      icon: <Gavel className="w-5 h-5" />
    },
    {
      id: 'parables',
      name: t('parables'),
      description: t('parablesDescription'),
      icon: <Scroll className="w-5 h-5" />
    },
    {
      id: 'others',
      name: t('others'),
      description: t('othersDescription'),
      icon: <MoreHorizontal className="w-5 h-5" />
    }
  ];

  const handleConfirm = () => {
    if (selectedGenre) {
      onConfirm(selectedGenre);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
            {t('selectGenre')}
          </DialogTitle>
          <p className="text-sm text-gray-600 mb-6">
            {t('selectGenreDescription')}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {genreOptions.map((genre) => (
            <div
              key={genre.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedGenre === genre.id
                  ? 'border-orange-500 bg-orange-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
              onClick={() => setSelectedGenre(genre.id)}
            >
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 ${
                  selectedGenre === genre.id ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {genre.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm ${
                    selectedGenre === genre.id ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {genre.name}
                  </h3>
                  <p className={`text-xs mt-1 ${
                    selectedGenre === genre.id ? 'text-blue-700' : 'text-gray-600'
                  }`}>
                    {genre.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="px-6"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedGenre}
            className="px-6 bg-orange-600 hover:bg-orange-700"
          >
            {t('confirmGenre')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenreSelectionModal;
