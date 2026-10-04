import { Landmark } from "../types";

/**
 * Calculates the angle at vertex B formed by points A-B-C (in degrees).
 * Uses Math.atan2 for reliable angle computation.
 */
export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * (180.0 / Math.PI));
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

/**
 * Calculates neck forward-lean angle.
 * Uses the ear as pivot and vertical reference vs shoulder line.
 * Returns degrees from vertical — larger = more forward lean.
 */
export function calculateNeckAngle(
  ear: Landmark,
  shoulder: Landmark
): number {
  // Create a vertical reference point directly above the ear
  const verticalRef: Landmark = { x: ear.x, y: ear.y - 0.1, z: ear.z };
  return calculateAngle(verticalRef, ear, shoulder);
}

/**
 * Calculates shoulder tilt (imbalance between left/right shoulder heights).
 * Returns angle in degrees — 0° = perfectly level.
 */
export function calculateShoulderTilt(
  leftShoulder: Landmark,
  rightShoulder: Landmark
): number {
  const dy = Math.abs(leftShoulder.y - rightShoulder.y);
  const dx = Math.abs(leftShoulder.x - rightShoulder.x);
  if (dx === 0) return 90;
  return Math.atan2(dy, dx) * (180.0 / Math.PI);
}

/**
 * Returns the average of left + right landmark for a stable midpoint.
 */
export function midpoint(a: Landmark, b: Landmark): Landmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1),
  };
}

/**
 * Checks if a landmark is reliable based on MediaPipe visibility score.
 */
export function isLandmarkReliable(lm: Landmark, minVisibility = 0.5): boolean {
  return (lm.visibility ?? 1) >= minVisibility;
}
