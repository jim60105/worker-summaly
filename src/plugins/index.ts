import * as amazon from './amazon.js';
import * as bluesky from './bluesky.js';
import * as plurk from './plurk.js';
import * as weibo from './weibo.js';
import * as wikipedia from './wikipedia.js';
import * as branchIoDeeplinks from './branchio-deeplinks.js';
import { SummalyPlugin } from '@/iplugin.js';

export const plugins: SummalyPlugin[] = [
	amazon,
	bluesky,
	plurk,
	weibo,
	wikipedia,
	branchIoDeeplinks,
];
