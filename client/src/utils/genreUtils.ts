import { useLanguage } from '../lib/i18n';

export const getGenreDisplayName = (genre: string | undefined, t: (key: string) => string): string => {
  if (!genre) return t('noGenre');
  
  const genreMap: Record<string, string> = {
    'narrative': t('narrative'),
    'poetry': t('poetry'),
    'poetic': t('poetic'),
    'legalSystem': t('legalSystem'),
    'instruction': t('instruction'),
    'letters': t('letters'),
    'judgment': t('judgment'),
    'parables': t('parables'),
    'others': t('others')
  };
  
  return genreMap[genre] || t('noGenre');
};

export const getGenreBadgeStyle = (genre: string | undefined): string => {
  if (!genre) {
    return "bg-gray-100 text-gray-600 border-gray-200";
  }
  
  const styleMap: Record<string, string> = {
    'narrative': "bg-orange-100 text-orange-800 border-orange-200",
    'poetry': "bg-purple-100 text-purple-800 border-purple-200",
    'poetic': "bg-pink-100 text-pink-800 border-pink-200",
    'legalSystem': "bg-indigo-100 text-indigo-800 border-indigo-200",
    'instruction': "bg-green-100 text-green-800 border-green-200",
    'letters': "bg-yellow-100 text-yellow-800 border-yellow-200",
    'judgment': "bg-red-100 text-red-800 border-red-200",
    'parables': "bg-orange-100 text-orange-800 border-orange-200",
    'others': "bg-gray-100 text-gray-600 border-gray-200"
  };
  
  return styleMap[genre] || "bg-gray-100 text-gray-600 border-gray-200";
};
