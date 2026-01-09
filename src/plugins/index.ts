import * as activitypub from './activitypub.js';
import * as amazon from './amazon.js';
import * as bahamut from './bahamut.js';
import * as booth from './booth.js';
import * as steam from './steam.js';
import * as ptt from './ptt.js';
import * as bilibili from './bilibili.js';
import * as bluesky from './bluesky.js';
import * as dlsite from './dlsite.js';
import * as ehentai from './ehentai.js';
import * as iwara from './iwara.js';
import * as komiflo from './komiflo.js';
import * as nijie from './nijie.js';
import * as threads from './threads.js';
import * as misskey from './misskey.js';
import * as plurk from './plurk.js';
import * as spotify from './spotify.js';
import * as weibo from './weibo.js';
import * as instagram from './instagram.js';
import * as pchome from './pchome.js';
import * as tiktok from './tiktok.js';
import * as twitter from './twitter.js';
import * as pixiv from './pixiv.js';
import * as wikipedia from './wikipedia.js';
import * as youtube from './youtube.js';
import * as branchIoDeeplinks from './branchio-deeplinks.js';
import { SummalyPlugin } from '@/iplugin.js';

export const plugins: SummalyPlugin[] = [
	misskey,
	activitypub,
	amazon,
	bahamut,
	booth,
	steam,
	ptt,
	bilibili,
	bluesky,
	dlsite,
	ehentai,
	iwara,
	komiflo,
	nijie,
	threads,
	plurk,
	spotify,
	weibo,
	instagram,
	pchome,
	tiktok,
	twitter,
	pixiv,
	wikipedia,
	youtube,
	branchIoDeeplinks,
];
