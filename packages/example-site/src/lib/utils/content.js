import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const CONTENT_DIR = path.join(process.cwd(), 'UserContent');

/**
 * Get site configuration
 */
export function getSiteConfig() {
	const configPath = path.join(CONTENT_DIR, 'site-config.json');
	if (fs.existsSync(configPath)) {
		return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
	}
	return null;
}

/**
 * Get a page's content by slug (About, Contact, Home)
 */
export function getPage(slug) {
	const pagePath = path.join(CONTENT_DIR, slug, `${slug.toLowerCase()}.md`);
	if (!fs.existsSync(pagePath)) {
		return null;
	}

	const fileContent = fs.readFileSync(pagePath, 'utf-8');
	const { data, content } = matter(fileContent);
	const html = marked(content);

	return {
		...data,
		content: html,
		rawContent: content
	};
}

/**
 * Get all blog posts
 */
export function getAllPosts() {
	const postsDir = path.join(CONTENT_DIR, 'Posts');
	if (!fs.existsSync(postsDir)) {
		return [];
	}

	const entries = fs.readdirSync(postsDir, { withFileTypes: true });
	const posts = [];

	for (const entry of entries) {
		if (entry.name.endsWith('.md')) {
			const slug = entry.name.replace('.md', '');
			const post = getPost(slug);
			if (post) {
				posts.push(post);
			}
		}
	}

	// Sort by date, newest first
	return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Get a single blog post by slug
 */
export function getPost(slug) {
	const postPath = path.join(CONTENT_DIR, 'Posts', `${slug}.md`);
	if (!fs.existsSync(postPath)) {
		return null;
	}

	const fileContent = fs.readFileSync(postPath, 'utf-8');
	const { data, content } = matter(fileContent);
	const html = marked(content);

	// Check for gutter content
	const gutterDir = path.join(CONTENT_DIR, 'Posts', slug, 'gutter');
	let gutterContent = null;

	if (fs.existsSync(gutterDir)) {
		const manifestPath = path.join(gutterDir, 'manifest.json');
		if (fs.existsSync(manifestPath)) {
			const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
			gutterContent = {
				items: manifest.items.map(item => {
					if (item.file && item.file.endsWith('.md')) {
						const itemPath = path.join(gutterDir, item.file);
						if (fs.existsSync(itemPath)) {
							const itemContent = fs.readFileSync(itemPath, 'utf-8');
							return {
								...item,
								content: marked(itemContent)
							};
						}
					}
					return item;
				})
			};
		}
	}

	return {
		slug,
		...data,
		content: html,
		rawContent: content,
		gutterContent
	};
}

/**
 * Get all recipes
 */
export function getAllRecipes() {
	const recipesDir = path.join(CONTENT_DIR, 'Recipes');
	if (!fs.existsSync(recipesDir)) {
		return [];
	}

	const entries = fs.readdirSync(recipesDir, { withFileTypes: true });
	const recipes = [];

	for (const entry of entries) {
		if (entry.name.endsWith('.md')) {
			const slug = entry.name.replace('.md', '');
			const recipe = getRecipe(slug);
			if (recipe) {
				recipes.push(recipe);
			}
		}
	}

	return recipes.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Get a single recipe by slug
 */
export function getRecipe(slug) {
	const recipePath = path.join(CONTENT_DIR, 'Recipes', `${slug}.md`);
	if (!fs.existsSync(recipePath)) {
		return null;
	}

	const fileContent = fs.readFileSync(recipePath, 'utf-8');
	const { data, content } = matter(fileContent);
	const html = marked(content);

	// Check for gutter content
	const gutterDir = path.join(CONTENT_DIR, 'Recipes', slug, 'gutter');
	let gutterContent = null;

	if (fs.existsSync(gutterDir)) {
		const manifestPath = path.join(gutterDir, 'manifest.json');
		if (fs.existsSync(manifestPath)) {
			const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
			gutterContent = {
				items: manifest.items.map(item => {
					if (item.file && item.file.endsWith('.md')) {
						const itemPath = path.join(gutterDir, item.file);
						if (fs.existsSync(itemPath)) {
							const itemContent = fs.readFileSync(itemPath, 'utf-8');
							return {
								...item,
								content: marked(itemContent)
							};
						}
					}
					return item;
				})
			};
		}
	}

	return {
		slug,
		...data,
		content: html,
		rawContent: content,
		gutterContent
	};
}

/**
 * Get latest post
 */
export function getLatestPost() {
	const posts = getAllPosts();
	return posts.length > 0 ? posts[0] : null;
}
