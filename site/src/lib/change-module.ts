// R-6: whether this build has the change module. CHANGE_MODULE=off in the environment (read by
// site.config.js, set here by vite.config.ts) leaves out its routes, links, sitemap entries, method
// section, credit and data (decision 75).

export const CHANGE_MODULE: boolean = __CHANGE_MODULE__;
