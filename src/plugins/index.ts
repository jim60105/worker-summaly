import * as amazon from './amazon.js';
import * as bahamut from './bahamut.js';
import * as bluesky from './bluesky.js';
import * as ptt from './ptt.js';
import * as wikipedia from './wikipedia.js';
import * as branchIoDeeplinks from './branchio-deeplinks.js';
import { SummalyPlugin } from '@/iplugin.js';

export const plugins: SummalyPlugin[] = [
	amazon,
	bahamut,
	bluesky,
	ptt,
	wikipedia,
	branchIoDeeplinks,
];
