import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter(),
		// The form-origin (CSRF) check runs in src/hooks.server.ts instead: the same rule,
		// minus /oauth/token, where MCP clients post forms with no Origin header.
		csrf: { trustedOrigins: ['*'] }
	}
};

export default config;
