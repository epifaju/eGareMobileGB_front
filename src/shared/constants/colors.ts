import tokens from './tokens.json';

/** Palette Gare Mobile GB — utilisée aussi par Tailwind (voir tailwind.config.js). */
export const colors = tokens.colors;

export type ColorToken = keyof typeof colors;
