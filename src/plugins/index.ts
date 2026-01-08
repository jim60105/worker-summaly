import * as amazon from './amazon.js';
import * as bluesky from './bluesky.js';
import * as twitter from './twitter.js';
import * as wikipedia from './wikipedia.js';
import * as branchIoDeeplinks from './branchio-deeplinks.js';
import { SummalyPlugin } from '@/iplugin.js';

export const plugins: SummalyPlugin[] = [
	amazon,
	bluesky,
	twitter,
	wikipedia,
	branchIoDeeplinks,
];
