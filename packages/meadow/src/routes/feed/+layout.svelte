<!--
  Feed Layout — Header with auth nav + Footer
-->
<script lang="ts">
  import { page } from '$app/state';
  import { Header, Footer, type NavItem } from '@autumnsgrove/groveengine/ui/chrome';
  import { buildLoginUrl } from '@autumnsgrove/groveengine/grafts/login';
  import { Trees, Bookmark, Rss } from 'lucide-svelte';

  let { children, data } = $props();

  const loggedIn = $derived(!!data?.user);

  const navItems: NavItem[] = $derived.by(() => {
    const items: NavItem[] = [
      { href: 'https://grove.place', label: 'Grove', icon: Trees, external: true },
      { href: '/feed', label: 'Feed', icon: Rss },
    ];
    if (loggedIn) {
      items.push({ href: '/bookmarks', label: 'Bookmarks', icon: Bookmark });
    }
    return items;
  });

  const headerUser = $derived(
    data?.user
      ? { id: data.user.id, name: data.user.name, email: data.user.email }
      : null,
  );

  // "My Grove" link → user's blog subdomain (not /arbor, which doesn't exist in meadow)
  const userHref = $derived(
    data?.userSubdomain
      ? `https://${data.userSubdomain}.grove.place`
      : 'https://grove.place',
  );
</script>

<Header
  {navItems}
  brandTitle="Meadow"
  showSignIn={true}
  signInHref={buildLoginUrl(`${page.url.origin}/feed`)}
  user={headerUser}
  {userHref}
/>

{@render children()}

<Footer />
