import { px } from './util';
import './Skeleton.css';

export interface SkeletonProps {
  h: number | string;
  w?: number | string;
  r?: number | string;
}

/** Static --soft block, no shimmer. */
export function Skeleton({ h, w = '100%', r = 12 }: SkeletonProps) {
  return <span class="iq-skel" aria-hidden="true" style={{ height: px(h), width: px(w), borderRadius: px(r) }} />;
}
