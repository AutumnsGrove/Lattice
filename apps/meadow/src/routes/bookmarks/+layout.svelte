<!--
  Bookmarks Layout — Reuses the same chrome as feed
-->
<script lang="ts">
  import { page } from '$app/state';
  import { Header, Footer, type NavItem } from '@autumnsgrove/lattice/ui/chrome';
  import { buildLoginUrl } from '@autumnsgrove/lattice/grafts/login';
  import { actionIcons } from '@autumnsgrove/prism/icons';
  import { defaultSuite, resolveIcon } from '@autumnsgrove/lattice/ui';

  let { children, data } = $props();

  const groveIcon = resolveIcon(defaultSuite.grove.icon);

  const headerUser = $derived(
    data?.user
      ? { id: data.user.id, name: data.user.name, email: data.user.email }
      : null,
  );

  const navItems: NavItem[] = [
    { href: 'https://grove.place', label: 'Grove', icon: groveIcon, external: true },
    { href: '/feed', label: 'Feed' },
    { href: '/bookmarks', label: 'Bookmarks', icon: actionIcons.bookmark },
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
