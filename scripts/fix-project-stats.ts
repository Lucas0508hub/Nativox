#!/usr/bin/env tsx

import { db, pool } from "../server/db";
import { projects, segments } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixProjectStats() {
  console.log("🔧 Fixing project statistics...\n");

  try {
    // Get all projects
    const allProjects = await db.select().from(projects);
    console.log(`Found ${allProjects.length} projects to check\n`);

    for (const project of allProjects) {
      console.log(`📊 Checking project: "${project.name}" (ID: ${project.id})`);
      
      // Get all segments for this project
      const projectSegments = await db
        .select()
        .from(segments)
        .where(eq(segments.projectId, project.id));

      if (projectSegments.length === 0) {
        console.log(`   ⚠️  No segments found - skipping\n`);
        continue;
      }

      // Calculate actual statistics
      const totalDuration = projectSegments.reduce((sum, segment) => sum + (segment.duration || 0), 0);
      const totalSegments = projectSegments.length;
      const transcribedSegments = projectSegments.filter(segment => segment.isTranscribed).length;

      console.log(`   📈 Current stats: ${project.duration}s duration, ${project.totalSegments} total segments, ${project.transcribedSegments} transcribed`);
      console.log(`   📈 Actual stats:  ${Math.round(totalDuration)}s duration, ${totalSegments} total segments, ${transcribedSegments} transcribed`);

      // Check if stats need updating
      const needsUpdate = 
        Math.round(project.duration) !== Math.round(totalDuration) ||
        project.totalSegments !== totalSegments ||
        project.transcribedSegments !== transcribedSegments;

      if (needsUpdate) {
        // Update project statistics
        await db
          .update(projects)
          .set({ 
            duration: Math.round(totalDuration),
            totalSegments,
            transcribedSegments,
            updatedAt: new Date() 
          })
          .where(eq(projects.id, project.id));

        console.log(`   ✅ Updated project statistics\n`);
      } else {
        console.log(`   ✅ Statistics are already correct\n`);
      }
    }

    console.log("🎉 Project statistics fix completed!");
    
  } catch (error) {
    console.error("❌ Error fixing project statistics:", error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixProjectStats();
}

export { fixProjectStats };
