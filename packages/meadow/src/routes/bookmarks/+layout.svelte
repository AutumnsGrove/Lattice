<!--
  Bookmarks Layout — Reuses the same chrome as feed
-->
<script lang="ts">
  import { page } from '$app/state';
  import { Header, Footer, type NavItem } from '@autumnsgrove/groveengine/ui/chrome';
  import { buildLoginUrl } from '@autumnsgrove/groveengine/grafts/login';
  import { Trees, Bookmark } from 'lucide-svelte';

  let { children, data } = $props();

  const headerUser = $derived(
    data?.user
      ? { id: data.user.id, name: data.user.name, email: data.user.email }
      : null,
  );

  const navItems: NavItem[] = [
    { href: 'https://grove.place', label: 'Grove', icon: Trees, external: true },
    { href: '/feed', label: 'Feed' },
    { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  ];
</script>

<Header
  {navItems}
  brandTitle="Meadow"
  showSignIn={true}
  signInHref={buildLoginUrl(`${page.url.origin}/auth/callback?returnTo=${encodeURIComponent(page.url.pathname)}`)}
  user={headerUser}
/>

{@render children()}

<Footer />
