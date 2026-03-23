import tokens from './tokens.json';

/** Rayons de bordure (px) — alignés sur theme.extend.borderRadius. */
export const radius = tokens.radius;

export type RadiusToken = keyof typeof radius;
