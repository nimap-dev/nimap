// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'nimap',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/nimap-dev/nimap' }],
			logo: {
				src: './src/assets/logo.svg'
			},
			sidebar: [
				{
					label: 'Getting started',
					translations: {
						cs: "Začínáme"
					},
					items: [{ autogenerate: { directory: 'getting-started' } }],
				},
				{
					label: 'User guide',
					translations: {
						cs: "Uživatelská příručka"
					},
					items: [{ autogenerate: { directory: 'user' } }],
				},
				{
					label: 'Administration',
					translations: {
						cs: "Administrace"
					},
					items: [{ autogenerate: { directory: 'admin' } }],

				},
				{
					label: 'Reference',
					translations: {
						cs: "Reference"
					},
					items: [{ autogenerate: { directory: 'reference' } }],
				},
			],
			defaultLocale: 'root',
			locales: {
				root: {
					lang: 'en',
					label: 'English',
				},
				cs: {
					lang: 'cs',
					label: 'Čeština',
				}
			},
			customCss: ['./src/styles/custom.css']
		}),
	],
	site: "https://nimap-dev.github.io",
	base: "/nimap"
});
