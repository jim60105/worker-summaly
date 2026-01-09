/**
 * summaly
 * https://github.com/misskey-dev/summaly
 */

import { SummalyResult } from '@/summary.js';
import { SummalyPlugin as _SummalyPlugin } from '@/iplugin.js';
import { general, type GeneralScrapingOptions } from '@/general.js';
import { head } from '@/utils/fetch.js';
import { plugins as builtinPlugins } from '@/plugins/index.js';

export type SummalyPlugin = _SummalyPlugin;

export type SummalyOptions = {
	/**
	 * Accept-Language for the request
	 */
	lang?: string | null;

	/**
	 * Whether follow redirects
	 */
	followRedirects?: boolean;

	/**
	 * Custom Plugins
	 */
	plugins?: SummalyPlugin[];

	/**
	 * User-Agent for the request
	 */
	userAgent?: string;

	/**
	 * Response timeout.
	 * Set timeouts for each phase, such as host name resolution and socket communication.
	 */
	responseTimeout?: number;

	/**
	 * Operation timeout.
	 * Set the timeout from the start to the end of the request.
	 */
	operationTimeout?: number;

	/**
	 * Maximum content length.
	 * If set to true, an error will occur if the content-length value returned from the other server is larger than this parameter (or if the received body size exceeds this parameter).
	 */
	contentLengthLimit?: number;

	/**
	 * Content length required.
	 * If set to true, it will be an error if the other server does not return content-length.
	 */
	contentLengthRequired?: boolean;
};

export const summalyDefaultOptions = {
	lang: null,
	followRedirects: true,
	plugins: [],
} as SummalyOptions;

/**
 * Get plugin name for logging purposes
 */
function getPluginName(plugin: SummalyPlugin): string {
	// Try to extract module name from the plugin's test function
	const testStr = plugin.test.toString();
	const hostnameMatch = testStr.match(/hostname\s*===?\s*['"]([^'"]+)['"]/);
	if (hostnameMatch) {
		return hostnameMatch[1];
	}
	// Fallback to a generic identifier
	return 'unknown-plugin';
}

/**
 * Summarize an web page
 */
export const summaly = async (url: string, options?: SummalyOptions): Promise<SummalyResult> => {
	const opts = Object.assign(summalyDefaultOptions, options);

	const plugins = builtinPlugins.concat(opts.plugins || []);

	let actualUrl = url;
	if (opts.followRedirects) {
		try {
			const response = await head(url);
			actualUrl = response.url;
			if (actualUrl !== url) {
				console.debug({
					event: 'url_redirect',
					originalUrl: url,
					resolvedUrl: actualUrl,
				});
			}
		} catch (error) {
			console.warn({
				event: 'redirect_check_failed',
				url,
				error: error instanceof Error ? error.message : String(error),
			});
			actualUrl = url;
		}
	}

	const _url = new URL(actualUrl);

	// Find matching plugin
	const match = plugins.filter(plugin => plugin.test(_url))[0];

	// Get summary
	const scrapingOptions: GeneralScrapingOptions = {
		lang: opts.lang,
		userAgent: opts.userAgent,
		responseTimeout: opts.responseTimeout,
		followRedirects: opts.followRedirects,
		operationTimeout: opts.operationTimeout,
		contentLengthLimit: opts.contentLengthLimit,
		contentLengthRequired: opts.contentLengthRequired,
	};

	let summary = null;
	const pluginName = match ? getPluginName(match) : null;

	if (match) {
		console.debug({
			event: 'plugin_matched',
			url: actualUrl,
			plugin: pluginName,
		});

		try {
			summary = await match.summarize(_url, scrapingOptions);

			if (summary == null) {
				// Plugin returned null, fallback to general
				console.info({
					event: 'plugin_returned_null',
					url: actualUrl,
					plugin: pluginName,
					action: 'falling_back_to_general',
				});
				summary = await general(_url, scrapingOptions);
			}
		} catch (error) {
			// Plugin threw an error, log it and fallback to general
			console.error({
				event: 'plugin_error',
				url: actualUrl,
				plugin: pluginName,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				action: 'falling_back_to_general',
			});

			try {
				summary = await general(_url, scrapingOptions);
			} catch (generalError) {
				console.error({
					event: 'general_fallback_error',
					url: actualUrl,
					plugin: pluginName,
					error: generalError instanceof Error ? generalError.message : String(generalError),
				});
				throw generalError;
			}
		}
	} else {
		console.debug({
			event: 'no_plugin_matched',
			url: actualUrl,
			action: 'using_general',
		});
		summary = await general(_url, scrapingOptions);
	}

	if (summary == null) {
		console.error({
			event: 'summarization_failed',
			url: actualUrl,
			plugin: pluginName,
		});
		throw new Error('failed summarize');
	}

	console.debug({
		event: 'summarization_complete',
		url: actualUrl,
		plugin: pluginName || 'general',
		hasTitle: !!summary.title,
		hasDescription: !!summary.description,
		hasThumbnail: !!summary.thumbnail,
		sensitive: summary.sensitive,
	});

	return Object.assign(summary, {
		url: actualUrl,
	});
};
