/**
 * test_character_skins.js
 *
 * Quick diagnostic for atlas JSON flip/orientation data.
 * - Fetches atlas JSONs for Archer (texture-254), Gnoll (texture-316), Viking/Skeleton Pirate (texture-196)
 * - Logs whether explicit flip fields exist, counts rotated frames, and lists idle/walk frames
 * - Helps verify default-facing assumptions used by EnemySystem
 *
 * Usage:
 * 1) Ensure the dev server is running
 * 2) Open your browser to the dev URL (e.g. http://localhost:8080)
 * 3) Open DevTools console and run: await window.testCharacterSkins()
 */
(function setupTest() {
  const atlasPaths = {
    Archer_1: '/public/assets/spritesheets/mobs/texture-254.json',
    Gnoll_3: '/public/assets/spritesheets/mobs/texture-316.json',
    Skeleton_Pirate_Captain_1: '/public/assets/spritesheets/mobs/texture-196.json'
  };

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.json();
  }

  function findFrames(frames, include) {
    return Object.keys(frames).filter((k) => include.some((inc) => k.includes(inc)));
  }

  function analyzeAtlas(name, data) {
    const frames = data.frames || {};
    const keys = Object.keys(frames);
    const rotatedTrue = keys.filter((k) => frames[k].rotated === true).length;
    const rotatedFalse = keys.filter((k) => frames[k].rotated === false).length;

    const explicitFlipFields = keys.filter((k) => {
      const f = frames[k];
      // Look for common flip fields that would indicate horizontal mirroring
      return (
        'flipped' in f || 'flip' in f || 'flipX' in f || 'mirror' in f || 'orientation' in f || 'facing' in f
      );
    });

    const idleFrames = findFrames(frames, ['Idle', 'Idle Blinking']);
    const walkFrames = findFrames(frames, ['Walking', 'Running', 'Run Slashing', 'Run Throwing']);

    // Heuristic: report sequence sample and any vector part frames that mention Left/Right
    const leftParts = findFrames(frames, ['Left Arm', 'Left Leg', 'Left Hand', 'Left Foot']);
    const rightParts = findFrames(frames, ['Right Arm', 'Right Leg', 'Right Hand', 'Right Foot']);

    console.group(`Analysis: ${name}`);
    console.info(`Total frames: ${keys.length}`);
    console.info(`rotated=true: ${rotatedTrue}, rotated=false: ${rotatedFalse}`);
    console.info(`Explicit flip fields found: ${explicitFlipFields.length}`);
    if (explicitFlipFields.length) console.info('Flip field keys:', explicitFlipFields.slice(0, 10));
    console.info(`Idle frame samples:`, idleFrames.slice(0, 5));
    console.info(`Walk/Run frame samples:`, walkFrames.slice(0, 5));
    console.info(`Vector parts (Left): ${leftParts.length}, (Right): ${rightParts.length}`);
    console.info('Left part samples:', leftParts.slice(0, 5));
    console.info('Right part samples:', rightParts.slice(0, 5));

    // Conclusion based on presence/absence of explicit flip fields
    if (!explicitFlipFields.length) {
      console.warn('No explicit flip flag present. Use default-facing mapping and movement-based flip.');
    } else {
      console.warn('Explicit flip fields detected. Verify integration in loader/rendering.');
    }
    console.groupEnd();
  }

  async function testCharacterSkins() {
    console.log('Starting atlas flip/orientation diagnostics...');
    for (const [variant, path] of Object.entries(atlasPaths)) {
      try {
        const json = await fetchJSON(path);
        analyzeAtlas(variant, json);
      } catch (err) {
        console.error(`Failed analyzing ${variant} (${path})`, err);
      }
    }
    console.log('Done. If Archer/Gnoll still look wrong, share exact motion/direction.');
  }
  // Expose to window for console usage
  window.testCharacterSkins = testCharacterSkins;
})();