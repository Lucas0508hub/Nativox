import { db } from '../server/db';
import { languages } from '@shared/schema';

async function createDefaultLanguages() {
  try {
    console.log('Creating default languages...');

    const defaultLanguages = [
      { code: 'en', name: 'English', isActive: true },
      { code: 'pt', name: 'Portuguese', isActive: true },
      { code: 'es', name: 'Spanish', isActive: true },
      { code: 'fr', name: 'French', isActive: true },
      { code: 'de', name: 'German', isActive: true },
      { code: 'it', name: 'Italian', isActive: true },
      { code: 'ru', name: 'Russian', isActive: true },
      { code: 'ja', name: 'Japanese', isActive: true },
      { code: 'ko', name: 'Korean', isActive: true },
      { code: 'zh', name: 'Chinese', isActive: true }
    ];

    for (const lang of defaultLanguages) {
      try {
        await db.insert(languages).values(lang);
        console.log(`✅ Created language: ${lang.name} (${lang.code})`);
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⚠️  Language ${lang.name} (${lang.code}) already exists`);
        } else {
          console.error(`❌ Error creating language ${lang.name}:`, error.message);
        }
      }
    }

    console.log('\n🎉 Default languages created successfully!');
    console.log('\nAvailable languages:');
    const allLanguages = await db.select().from(languages);
    allLanguages.forEach(lang => {
      console.log(`- ${lang.name} (${lang.code})`);
    });

  } catch (error) {
    console.error('Error creating default languages:', error);
  } finally {
    process.exit(0);
  }
}

createDefaultLanguages();
