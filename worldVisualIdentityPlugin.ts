import type { Plugin } from "vite";

/**
 * Purely visual biome identities.
 * This plugin only changes the colors/ambient decoration created by
 * drawWorld/createMarshAtmosphere. It deliberately does not touch placement,
 * paths, waves, enemies, progression, terrain gameplay or tower logic.
 */
export function worldVisualIdentity(): Plugin {
  return {
    name: "world-visual-identity",
    enforce: "post",
    transform(code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");
      if (!normalizedId.endsWith("/src/main.ts")) return null;

      const anchor = "  private drawWorld(): void {";
      if (!code.includes(anchor)) return null;

      const helper = `  private getWorldVisualTheme(): { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number; sun: number; sunHalo: number; water: number; waterLight: number; land: number; accent: number; mist: number; spore: number; night: boolean } {\n    const themes = [\n      { topLeft: 0xc8bb94, topRight: 0xd8cba5, bottomLeft: 0xb9ad88, bottomRight: 0xcdbf98, sun: 0xf1cf78, sunHalo: 0xf6d98b, water: 0x72a9a9, waterLight: 0xa9cec1, land: 0x8f8060, accent: 0x78aeae, mist: 0xa7c4bc, spore: 0x9fbf8f, night: false },\n      { topLeft: 0xb9b889, topRight: 0xd1c99a, bottomLeft: 0x8eaa7f, bottomRight: 0xb7b987, sun: 0xf0ce72, sunHalo: 0xf6df9a, water: 0x629b8c, waterLight: 0x91c1a5, land: 0x7f7954, accent: 0x659a78, mist: 0x9fc0aa, spore: 0xb5c97e, night: false },\n      { topLeft: 0xb58d7e, topRight: 0xc9a18d, bottomLeft: 0x8f716d, bottomRight: 0xa98479, sun: 0xe6aa65, sunHalo: 0xf0c58b, water: 0x668f86, waterLight: 0x8fb0a0, land: 0x825d55, accent: 0x9a625d, mist: 0xb39b91, spore: 0xd1a06d, night: false },\n      { topLeft: 0x846d67, topRight: 0xa28274, bottomLeft: 0x665b5c, bottomRight: 0x7b6863, sun: 0xd68b59, sunHalo: 0xe3aa77, water: 0x4e7772, waterLight: 0x75968a, land: 0x684c48, accent: 0x7e4e52, mist: 0x8d7c79, spore: 0xc38264, night: false },\n      { topLeft: 0x728a68, topRight: 0x91a77a, bottomLeft: 0x536f59, bottomRight: 0x6e8666, sun: 0xe1c76d, sunHalo: 0xece09b, water: 0x4f8c76, waterLight: 0x75ad89, land: 0x5d704e, accent: 0x679c68, mist: 0x8eae88, spore: 0xc6d47c, night: false },\n      { topLeft: 0x657b5e, topRight: 0x82936a, bottomLeft: 0x4d6354, bottomRight: 0x63745c, sun: 0xd8bd68, sunHalo: 0xe6d88f, water: 0x497c70, waterLight: 0x6f9f84, land: 0x596149, accent: 0x788a54, mist: 0x819a7f, spore: 0xd2b95f, night: false },\n      { topLeft: 0x738c69, topRight: 0x8fa277, bottomLeft: 0x4d735f, bottomRight: 0x63866b, sun: 0xd5cf72, sunHalo: 0xe7e39b, water: 0x438b78, waterLight: 0x6ab895, land: 0x607153, accent: 0x58a775, mist: 0x82aa8e, spore: 0xb9d96f, night: false },\n      { topLeft: 0x526e63, topRight: 0x6f8772, bottomLeft: 0x365b58, bottomRight: 0x4c7062, sun: 0xb9c97b, sunHalo: 0xd1dda0, water: 0x367b73, waterLight: 0x58a58e, land: 0x4a6250, accent: 0x4e9c78, mist: 0x6e9584, spore: 0x9bdc72, night: false },\n      { topLeft: 0x303f4d, topRight: 0x40505b, bottomLeft: 0x24333e, bottomRight: 0x33434b, sun: 0xb7d6c8, sunHalo: 0x8fc9bd, water: 0x315d67, waterLight: 0x4e7e79, land: 0x39464a, accent: 0x4f7770, mist: 0x779596, spore: 0x9ddca9, night: true },\n      { topLeft: 0x293747, topRight: 0x38475a, bottomLeft: 0x202d39, bottomRight: 0x2d3c4a, sun: 0xaac8ca, sunHalo: 0x7fb9bd, water: 0x294f62, waterLight: 0x3e7180, land: 0x343c47, accent: 0x486b72, mist: 0x667f8c, spore: 0x87d7b0, night: true },\n      { topLeft: 0x504b55, topRight: 0x645a62, bottomLeft: 0x37383f, bottomRight: 0x48434b, sun: 0xc3a07a, sunHalo: 0xd3b994, water: 0x465e62, waterLight: 0x697d75, land: 0x514646, accent: 0x72545e, mist: 0x776f72, spore: 0xc09579, night: true },\n      { topLeft: 0x3f3a45, topRight: 0x554752, bottomLeft: 0x2b3037, bottomRight: 0x3d363f, sun: 0xb88f72, sunHalo: 0xc7a58a, water: 0x3b535b, waterLight: 0x596c68, land: 0x463b3d, accent: 0x694451, mist: 0x6b6067, spore: 0xb47975, night: true },\n      { topLeft: 0x42354f, topRight: 0x594363, bottomLeft: 0x283344, bottomRight: 0x3b3851, sun: 0xc39b8b, sunHalo: 0xd0b1a2, water: 0x36566c, waterLight: 0x526f7d, land: 0x4b3e4c, accent: 0x76517a, mist: 0x6c6379, spore: 0xc583a9, night: true },\n      { topLeft: 0x342d48, topRight: 0x4b3658, bottomLeft: 0x202b3d, bottomRight: 0x342e49, sun: 0xc48f9e, sunHalo: 0xd5a8b3, water: 0x304c68, waterLight: 0x4c6c82, land: 0x443744, accent: 0x754570, mist: 0x625b78, spore: 0xd17cb2, night: true },\n      { topLeft: 0x29243d, topRight: 0x402b4b, bottomLeft: 0x192738, bottomRight: 0x2d2941, sun: 0xd08aa8, sunHalo: 0xdfa9bd, water: 0x29465f, waterLight: 0x45677d, land: 0x3e303d, accent: 0x7e416e, mist: 0x59536f, spore: 0xe178b5, night: true },\n      { topLeft: 0x22283a, topRight: 0x34304a, bottomLeft: 0x172636, bottomRight: 0x283143, sun: 0xb8a3c8, sunHalo: 0xcbbbd8, water: 0x284a61, waterLight: 0x426a7a, land: 0x35353e, accent: 0x605477, mist: 0x505f70, spore: 0xa996d9, night: true },\n    ];\n    return themes[Math.min(this.levelIndex, themes.length - 1)];\n  }\n\n`;

      let transformed = code.replace(anchor, helper + anchor);

      transformed = transformed.replace(
        `    const background = this.add.graphics();\n    background.fillGradientStyle(0xc8bb94, 0xd8cba5, 0xb9ad88, 0xcdbf98, 1);`,
        `    const theme = this.getWorldVisualTheme();\n    const background = this.add.graphics();\n    background.fillGradientStyle(theme.topLeft, theme.topRight, theme.bottomLeft, theme.bottomRight, 1);`,
      );

      transformed = transformed.replace(
        `  private createMarshAtmosphere(): void {\n    const sunX = 58;`,
        `  private createMarshAtmosphere(): void {\n    const theme = this.getWorldVisualTheme();\n    const sunX = 58;`,
      );
      transformed = transformed.replace("const sunHalo = this.add.circle(sunX, sunY, 50, 0xf6d98b, 0.1);", "const sunHalo = this.add.circle(sunX, sunY, 50, theme.sunHalo, theme.night ? 0.07 : 0.1);");
      transformed = transformed.replace("const sun = this.add.circle(sunX, sunY, 27, 0xf1cf78, 0.86).setStrokeStyle(2, 0xffe5a6, 0.55);", "const sun = this.add.circle(sunX, sunY, 27, theme.sun, theme.night ? 0.55 : 0.86).setStrokeStyle(2, theme.sunHalo, 0.55);");
      transformed = transformed.replace("sunRays.lineStyle(2, 0xf8dda0, 0.32);", "sunRays.lineStyle(2, theme.sunHalo, theme.night ? 0.12 : 0.32);");
      transformed = transformed.replaceAll("terrain.fillStyle(0x8f8060, 0.24);", "terrain.fillStyle(theme.land, 0.24);");
      transformed = transformed.replaceAll("terrain.fillStyle(0x72a9a9, 0.38);", "terrain.fillStyle(theme.water, 0.38);");
      transformed = transformed.replaceAll("terrain.fillStyle(0xa9cec1, 0.28);", "terrain.fillStyle(theme.waterLight, 0.28);");
      transformed = transformed.replaceAll("terrain.fillStyle(0x928363, 0.22);", "terrain.fillStyle(theme.land, 0.22);");
      transformed = transformed.replaceAll("terrain.fillStyle(0x78aeae, 0.34);", "terrain.fillStyle(theme.accent, 0.34);");
      transformed = transformed.replaceAll("terrain.fillStyle(0xb0d1c6, 0.24);", "terrain.fillStyle(theme.waterLight, 0.24);");
      transformed = transformed.replace("waterSheen.lineStyle(2, 0xd1e2dc, 0.27);", "waterSheen.lineStyle(2, theme.waterLight, theme.night ? 0.2 : 0.27);");
      transformed = transformed.replaceAll("0xa7c4bc, 0.035", "theme.mist, theme.night ? 0.055 : 0.035");
      transformed = transformed.replaceAll("0x9fbf8f, 0.25", "theme.spore, theme.night ? 0.42 : 0.25");

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
