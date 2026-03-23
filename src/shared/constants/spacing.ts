import tokens from './tokens.json';

/** Échelle d’espacement (px) — alignée sur NativeWind / theme.extend.spacing. */
export const spacing = tokens.spacing;

export type SpacingToken = keyof typeof spacing;
