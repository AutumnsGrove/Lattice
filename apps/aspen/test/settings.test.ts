import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createTenant, json, page, request, signIn, tenantIdFor } from "./harness";

/**
 * Settings and tenant secrets: the tenant-scoped writes that change how a grove
 * looks, and the values a tenant stores that must never come back out.
 */

const OWNER_EMAIL = "owner@example.test";
const STRANGER_EMAIL = "stranger@example.test";
const SECRET_VALUE = "sk-live-do-not-leak-4f8a2c";

function writeHeaders(tenant: string, cookie: string): Record<string, string> {
	return {
		origin: `https://${tenant}.grove.place`,
		"content-type": "application/json",
		cookie,
	};
}

/** Signs in as the owner of the groves these tests create. */
function ownerSession(): Promise<string> {
	return signIn(undefined, { email: OWNER_EMAIL });
}

async function setSetting(
	tenant: string,
	cookie: string,
	setting_key: string,
	setting_value: string,
) {
	return json<{ success?: boolean; error?: string }>("/api/admin/settings", {
		tenant,
		cookie,
		method: "PUT",
		headers: writeHeaders(tenant, cookie),
		body: JSON.stringify({ setting_key, setting_value }),
	});
}

async function putSecret(tenant: string, cookie: string, keyName: string, value: string) {
	return json<{ success?: boolean; error?: string }>(
		`/api/tenants/${await tenantIdFor(tenant)}/secrets`,
		{
			tenant,
			cookie,
			method: "PUT",
			headers: writeHeaders(tenant, cookie),
			body: JSON.stringify({ keyName, value }),
		},
	);
}

async function listSecrets(tenant: string, cookie: string) {
	const tenantId = await tenantIdFor(tenant);
	return json<{ secrets?: { keyName: string; createdAt: number; updatedAt: number }[] }>(
		`/api/tenants/${tenantId}/secrets`,
		{ tenant, cookie },
	);
}

describe("site settings", () => {
	describe("happy", () => {
		it("reads defaults, then a change, then the change back", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });

			const before = await json<Record<string, string>>("/api/settings", { tenant });
			const changed = await setSetting(tenant, await ownerSession(), "grove_title", "Willow House");
			const after = await json<Record<string, string>>("/api/settings", { tenant });

			expect(before.status).toBe(200);
			expect(before.body.grove_title).toBeUndefined();
			expect(changed.status).toBe(200);
			expect(after.body.grove_title).toBe("Willow House");
		});

		it("scopes settings to the tenant that owns them", async () => {
			const mine = await createTenant({ ownerEmail: OWNER_EMAIL });
			const theirs = await createTenant({ ownerEmail: OWNER_EMAIL });
			await setSetting(mine, await ownerSession(), "grove_title", "Only Mine");

			const theirRead = await json<Record<string, string>>("/api/settings", { tenant: theirs });

			expect(theirRead.body.grove_title).toBeUndefined();
		});

		it("renders the settings hub for the owner", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });

			const hub = await page("/arbor/settings", { tenant, cookie: await ownerSession() });

			expect(hub.status).toBe(200);
			expect(hub.html.length).toBeGreaterThan(1000);
		});
	});

	describe("bad", () => {
		it("refuses an unauthenticated settings write", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });

			const result = await json("/api/admin/settings", {
				tenant,
				method: "PUT",
				headers: { origin: `https://${tenant}.grove.place`, "content-type": "application/json" },
				body: JSON.stringify({ setting_key: "grove_title", setting_value: "Nope" }),
			});

			expect(result.status).toBe(401);
		});

		it("refuses a setting that is not on the whitelist", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });

			const result = await setSetting(tenant, await ownerSession(), "arbitrary_injection", "x");

			expect(result.status).toBe(400);
		});

		it("refuses a season that does not exist", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });

			const result = await setSetting(tenant, await ownerSession(), "preferred_season", "monsoon");

			expect(result.status).toBe(400);
		});

		it("refuses a colour that is not a colour", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });

			const result = await setSetting(tenant, await ownerSession(), "accent_color", "chartreuse");

			expect(result.status).toBe(400);
		});
	});

	describe("sad", () => {
		it("still renders when another tenant's settings are broken", async () => {
			// One grove writing nonsense must not stop another grove's page.
			const broken = await createTenant({ ownerEmail: OWNER_EMAIL });
			await env.DB.prepare(
				"INSERT INTO site_settings (tenant_id, setting_key, setting_value) VALUES (?, 'font_family', 'no-such-font')",
			)
				.bind(await tenantIdFor(broken))
				.run();

			const healthy = await createTenant({ ownerEmail: OWNER_EMAIL });
			const rendered = await page("/", { tenant: healthy });

			expect(rendered.status).toBe(200);
		});

		it("answers 404 when a stranger edits a grove's settings", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });
			const stranger = await signIn(undefined, { email: STRANGER_EMAIL });

			const result = await setSetting(tenant, stranger, "grove_title", "Hijacked");

			expect(result.status).toBe(404);
		});
	});
});

describe("tenant secrets", () => {
	describe("happy", () => {
		it("stores a secret and lists only its key", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });
			const cookie = await ownerSession();

			const stored = await putSecret(tenant, cookie, "OPENROUTER_API_KEY", SECRET_VALUE);
			const listed = await listSecrets(tenant, cookie);

			expect(stored.status).toBe(200);
			expect(listed.status).toBe(200);
			expect(listed.body.secrets?.map((s) => s.keyName)).toContain("OPENROUTER_API_KEY");
		});

		it("deletes a secret and it stops being listed", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });
			const cookie = await ownerSession();
			await putSecret(tenant, cookie, "TEMP_KEY", SECRET_VALUE);
			const tenantId = await tenantIdFor(tenant);

			const removed = await json(`/api/tenants/${tenantId}/secrets`, {
				tenant,
				cookie,
				method: "DELETE",
				headers: writeHeaders(tenant, cookie),
				body: JSON.stringify({ keyName: "TEMP_KEY" }),
			});
			const listed = await listSecrets(tenant, cookie);

			expect(removed.status).toBe(200);
			expect(listed.body.secrets?.map((s) => s.keyName)).not.toContain("TEMP_KEY");
		});
	});

	describe("bad", () => {
		it("refuses every verb without a session", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });
			const tenantId = await tenantIdFor(tenant);

			const list = await json(`/api/tenants/${tenantId}/secrets`, { tenant });
			const write = await json(`/api/tenants/${tenantId}/secrets`, {
				tenant,
				method: "PUT",
				headers: { origin: `https://${tenant}.grove.place`, "content-type": "application/json" },
				body: JSON.stringify({ keyName: "X", value: "y" }),
			});
			const remove = await json(`/api/tenants/${tenantId}/secrets`, {
				tenant,
				method: "DELETE",
				headers: { origin: `https://${tenant}.grove.place`, "content-type": "application/json" },
				body: JSON.stringify({ keyName: "X" }),
			});

			expect([list.status, write.status, remove.status]).toEqual([401, 401, 401]);
		});

		it("refuses a key name that is not a key name", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });
			const cookie = await ownerSession();

			const stored = await putSecret(tenant, cookie, "not a key!", SECRET_VALUE);

			expect(stored.status).toBe(400);
		});

		it("answers 404 when deleting a secret that was never there", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });
			const cookie = await ownerSession();
			const tenantId = await tenantIdFor(tenant);

			const removed = await json(`/api/tenants/${tenantId}/secrets`, {
				tenant,
				cookie,
				method: "DELETE",
				headers: writeHeaders(tenant, cookie),
				body: JSON.stringify({ keyName: "NEVER_SET" }),
			});

			expect(removed.status).toBe(404);
		});

		it("answers 404 when a stranger reaches for another grove's secrets", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });
			const owner = await ownerSession();
			await putSecret(tenant, owner, "OPENROUTER_API_KEY", SECRET_VALUE);
			const stranger = await signIn(undefined, { email: STRANGER_EMAIL });

			const listed = await listSecrets(tenant, stranger);

			expect(listed.status).toBe(404);
		});
	});

	describe("sad", () => {
		it("never puts a secret value in any response body", async () => {
			// The point of the whole feature: a stored value is write-only. Asserted
			// by searching the serialized response, not by checking a field name.
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });
			const cookie = await ownerSession();
			await putSecret(tenant, cookie, "OPENROUTER_API_KEY", SECRET_VALUE);

			const bodies = [
				(await listSecrets(tenant, cookie)).body,
				(await request("/api/settings", { tenant, cookie })).status,
				(await page("/arbor/settings", { tenant, cookie })).html,
				(await page("/arbor/account", { tenant, cookie })).html,
			];

			expect(JSON.stringify(bodies)).not.toContain(SECRET_VALUE);
		});

		it("rotates a secret without leaving the old value readable anywhere", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });
			const cookie = await ownerSession();
			await putSecret(tenant, cookie, "ROTATING_KEY", "old-value-000");
			await putSecret(tenant, cookie, "ROTATING_KEY", "new-value-111");

			const listed = await listSecrets(tenant, cookie);
			const serialized = JSON.stringify(listed.body);
			const row = await env.DB.prepare(
				"SELECT encrypted_value FROM tenant_secrets WHERE tenant_id = ? AND key_name = ?",
			)
				.bind(await tenantIdFor(tenant), "ROTATING_KEY")
				.first<{ encrypted_value: string }>();

			expect(serialized).not.toContain("old-value-000");
			expect(serialized).not.toContain("new-value-111");
			expect(row?.encrypted_value).toBeTruthy();
			expect(row?.encrypted_value).not.toContain("new-value-111");
		});

		it("lists nothing when no secrets are set, rather than failing", async () => {
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });

			const listed = await listSecrets(tenant, await ownerSession());

			expect(listed.status).toBe(200);
			expect(listed.body.secrets).toEqual([]);
		});

		it("keeps the old owner out when a subdomain is reassigned", async () => {
			// The subdomain now belongs to someone else. The previous owner's
			// session still exists, but nothing under that grove is theirs.
			const before = await createTenant({ subdomain: "reassigned-grove", ownerEmail: OWNER_EMAIL });
			const oldOwner = await signIn(undefined, { email: OWNER_EMAIL });
			await putSecret(before, oldOwner, "OPENROUTER_API_KEY", SECRET_VALUE);

			const formerId = await tenantIdFor(before);
			await env.DB.prepare("UPDATE tenants SET subdomain = ? WHERE id = ?")
				.bind("reassigned-grove-old", formerId)
				.run();
			await createTenant({
				subdomain: "reassigned-grove",
				displayName: "Someone Else",
				ownerEmail: STRANGER_EMAIL,
			});

			const listed = await listSecrets(before, oldOwner);
			const settings = await json("/api/settings", { tenant: before, cookie: oldOwner });

			expect([404, 403]).toContain(listed.status);
			expect(JSON.stringify(settings.body)).not.toContain(SECRET_VALUE);
		});

		it("still loads the account page at 99% storage", async () => {
			// A full grove is not a broken grove: the quota page has to say
			// something true instead of failing to render.
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });
			await env.DB.prepare("UPDATE tenants SET storage_used = ? WHERE subdomain = ?")
				.bind(99 * 1024 * 1024, tenant)
				.run();

			const account = await page("/arbor/account", { tenant, cookie: await ownerSession() });

			expect(account.status).toBe(200);
			expect(account.html).toMatch(/\d/);
		});
	});
});
