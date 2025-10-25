const buildSuffix = (url?: {
	query?: Record<
		string,
		string | number | boolean | Array<string | number | boolean>
	>;
	hash?: string;
}) => {
	const query = url?.query;
	const hash = url?.hash;
	if (!query && !hash) return "";
	const search = (() => {
		if (!query) return "";

		const params = new URLSearchParams();

		Object.entries(query).forEach(([key, value]) => {
			if (Array.isArray(value)) {
				value.forEach((item) => params.append(key, String(item)));
			} else {
				params.set(key, String(value));
			}
		});

		return `?${params.toString()}`;
	})();
	return `${search}${hash ? `#${hash}` : ""}`;
};

export const pagesPath = {
	projects: {
		_projectId: (projectId: string | number) => ({
			sessions: {
				_sessionId: (sessionId: string | number) => ({
					$url: (url?: { hash?: string }) => ({
						pathname: "/projects/[projectId]/sessions/[sessionId]" as const,
						query: { projectId, sessionId },
						hash: url?.hash,
						path: `/projects/${projectId}/sessions/${sessionId}${buildSuffix(url)}`,
					}),
				}),
			},
			$url: (url?: { hash?: string }) => ({
				pathname: "/projects/[projectId]" as const,
				query: { projectId },
				hash: url?.hash,
				path: `/projects/${projectId}${buildSuffix(url)}`,
			}),
		}),
		$url: (url?: { hash?: string }) => ({
			pathname: "/projects" as const,
			hash: url?.hash,
			path: `/projects${buildSuffix(url)}`,
		}),
	},
	$url: (url?: { hash?: string }) => ({
		pathname: "/" as const,
		hash: url?.hash,
		path: `/${buildSuffix(url)}`,
	}),
};

export type PagesPath = typeof pagesPath;

export const staticPath = {
	_gitkeep: "/.gitkeep",
} as const;

export type StaticPath = typeof staticPath;
