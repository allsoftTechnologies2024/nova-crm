// Plain (non-client) module so both the server layout and the client rail get the real string.
// Cookie, not localStorage, so the server renders the rail at the right width on the next load, with no flash.
export const ADMIN_SIDEBAR_COOKIE = 'admin_sidebar';
