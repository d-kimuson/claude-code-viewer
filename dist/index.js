#!/usr/bin/env node

await import("./standalone/server.js").catch((error) => {
	console.error(error);
	process.exit(1);
});
