// src/env.d.ts
export interface Env {
	// 在此定義 Workers 綁定（bindings）
	// 例如 KV namespaces、D1 databases、secrets 等

	// 可選：自訂 User-Agent
	BOT_USER_AGENT?: string;
}
