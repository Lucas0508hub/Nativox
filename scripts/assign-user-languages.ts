import { db } from '../server/db';
import { users, userLanguages, languages } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function assignUserLanguages() {
  try {
    console.log('Assigning languages to users...');

    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users`);

    // Get all languages
    const allLanguages = await db.select().from(languages);
    console.log(`Found ${allLanguages.length} languages`);

    // Assign languages to editors
    for (const user of allUsers) {
      if (user.role === 'editor') {
        console.log(`\nAssigning languages to editor: ${user.username}`);
        
        // Assign Portuguese and English to all editors by default
        const languagesToAssign = allLanguages.filter(lang => 
          ['pt', 'en'].includes(lang.code)
        );

        for (const language of languagesToAssign) {
          try {
            await db.insert(userLanguages).values({
              userId: user.id,
              languageId: language.id
            });
            console.log(`✅ Assigned ${language.name} to ${user.username}`);
          } catch (error: any) {
            if (error.code === '23505') { // Unique constraint violation
              console.log(`⚠️  ${user.username} already has ${language.name} assigned`);
            } else {
              console.error(`❌ Error assigning ${language.name} to ${user.username}:`, error.message);
            }
          }
        }
      } else {
        console.log(`⏭️  Skipping ${user.username} (role: ${user.role})`);
      }
    }

    console.log('\n🎉 Language assignments completed!');
    
    // Show final assignments
    console.log('\nCurrent user language assignments:');
    const assignments = await db
      .select({
        username: users.username,
        role: users.role,
        languageName: languages.name,
        languageCode: languages.code
      })
      .from(userLanguages)
      .innerJoin(users, eq(userLanguages.userId, users.id))
      .innerJoin(languages, eq(userLanguages.languageId, languages.id));

    assignments.forEach(assignment => {
      console.log(`- ${assignment.username} (${assignment.role}): ${assignment.languageName} (${assignment.languageCode})`);
    });

  } catch (error) {
    console.error('Error assigning user languages:', error);
  } finally {
    process.exit(0);
  }
}

assignUserLanguages();
