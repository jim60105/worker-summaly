import * as amazon from './amazon.js';
import * as bahamut from './bahamut.js';
import * as ptt from './ptt.js';
import * as bilibili from './bilibili.js';
import * as bluesky from './bluesky.js';
import * as ehentai from './ehentai.js';
import * as threads from './threads.js';
import * as misskey from './misskey.js';
import * as plurk from './plurk.js';
import * as weibo from './weibo.js';
import * as instagram from './instagram.js';
import * as pchome from './pchome.js';
import * as tiktok from './tiktok.js';
import * as twitter from './twitter.js';
import * as wikipedia from './wikipedia.js';
import * as branchIoDeeplinks from './branchio-deeplinks.js';
import { SummalyPlugin } from '@/iplugin.js';

export const plugins: SummalyPlugin[] = [
	amazon,
	bahamut,
	ptt,
	bilibili,
	bluesky,
	ehentai,
	threads,
	misskey,
	plurk,
	weibo,
	instagram,
	pchome,
	tiktok,
	twitter,
	wikipedia,
	branchIoDeeplinks,
];
