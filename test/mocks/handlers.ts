/**
 * MSW (Mock Service Worker) handlers for test mocking
 */
import { http, HttpResponse } from 'msw';
import { getHtmlFixture } from '../fixtures/html.js';
import { getOembedFixture } from '../fixtures/oembed.js';

const port = 3060;
const host = `http://localhost:${port}`;

/**
 * Create a handler for serving HTML fixtures
 */
export function createHtmlHandler(path: string, fixtureName: string) {
	return http.get(`${host}${path}`, () => {
		const html = getHtmlFixture(fixtureName);
		return HttpResponse.html(html);
	});
}

/**
 * Create a handler for serving oEmbed JSON fixtures
 */
export function createOembedHandler(path: string, fixtureName: string) {
	return http.get(`${host}${path}`, () => {
		const json = getOembedFixture(fixtureName);
		return HttpResponse.json(json);
	});
}

/**
 * Create a handler for returning specific status codes
 */
export function createStatusHandler(path: string, status: number) {
	return http.get(`${host}${path}`, () => {
		return new HttpResponse(null, { status });
	});
}

/**
 * Create a handler with custom headers
 */
export function createHeaderHandler(path: string, fixtureName: string, headers: Record<string, string>) {
	return http.get(`${host}${path}`, () => {
		const html = getHtmlFixture(fixtureName);
		return HttpResponse.html(html, { headers });
	});
}

/**
 * Default handlers for common test scenarios
 */
export const defaultHandlers = [
	// Favicon endpoints
	http.get(`${host}/favicon.ico`, () => {
		return new HttpResponse(null, { status: 200 });
	}),
];

export { host, port };
