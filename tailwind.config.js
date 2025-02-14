/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}',
		'./node_modules/preline/preline.js',
//		'./node_modules/preline-ui/**/*.{html,js}',
	],
	theme: {
	  extend: {},
	},
	plugins: [
		require('preline/plugin'),
//		require('preline-ui'),
	],
}
