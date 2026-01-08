import * as amazon from './amazon.js';
import * as bilibili from './bilibili.js';
import * as bluesky from './bluesky.js';
import * as misskey from './misskey.js';
import * as wikipedia from './wikipedia.js';
import * as branchIoDeeplinks from './branchio-deeplinks.js';
import { SummalyPlugin } from '@/iplugin.js';

export const plugins: SummalyPlugin[] = [
	amazon,
	bilibili,
	bluesky,
	misskey,
	wikipedia,
	branchIoDeeplinks,
];
