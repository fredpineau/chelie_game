import type { Plugin } from "vite";

/**
 * BIOME 02 visual-only override.
 * This plugin changes only the already-generated visual theme palette.
 * It does not inject methods, callbacks or gameplay code.
 */
export function world2CanopyVisual(): Plugin {
  return {
    name: "world-2-canopy-visual",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const currentTheme = "{ topLeft: 0x78976a, topRight: 0xa6b978, bottomLeft: 0x4e765e, bottomRight: 0x668c67, sun: 0xf4d56f, sunHalo: 0xffe9a0, water: 0x397f72, waterLight: 0x6fb18d, land: 0x5c7147, accent: 0x4f9b66, mist: 0x84aa86, spore: 0xc8dc68, night: false }";
      const world2Theme = "{ topLeft: 0x123d2a, topRight: 0x1f6540, bottomLeft: 0x08291e, bottomRight: 0x11462f, sun: 0xffe070, sunHalo: 0xffef9a, water: 0x146f78, waterLight: 0x52c7ad, land: 0x315f32, accent: 0x41a85f, mist: 0x69b88a, spore: 0xd8ff5f, night: false }";

      const transformed = code.replace(currentTheme, world2Theme);
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
