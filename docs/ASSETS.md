# ASSETS (everything procedural, zero external files)

| Asset | Generation | Module |
|---|---|---|
| 32-color palette + fog/shading LUT | fixed table + blend toward fog | `engine/palette.ts` |
| 64x64 walls: wallpaper, wood, brick, door, locked door | per-pixel functions with deterministic hash | `engine/textures.ts` |
| 64x64 floors: wood, tile, stone, carpet; ceiling with beams | same | `engine/textures.ts` |
| 32x32 sprites: key, tonic, bullets, shells, shotgun, lamp, plant, barrel | primitives (rect/disc/line) + outline | `engine/sprites.ts` |
| Zombies, first-person weapons, HUD, icons, logo, bitmap font | pending (H4-H5) | - |
| SFX and music | pending (H5/H5b), Web Audio | `audio/` |
