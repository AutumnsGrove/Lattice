// Package lattice provides an API client for the Lattice blog platform.
//
// It handles tenant-scoped CRUD operations for blog posts and drafts,
// with Bearer token authentication via Heartwood.
package lattice

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// DefaultBaseURL is the production Lattice API base.
const DefaultBaseURL = "https://grove.place"

// Post represents a blog post.
type Post struct {
	ID          string   `json:"id"`
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Content     string   `json:"content,omitempty"`
	Excerpt     string   `json:"excerpt,omitempty"`
	Status      string   `json:"status"`
	PublishedAt string   `json:"publishedAt,omitempty"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"`
	Author      *Author  `json:"author,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}

// Author represents a post author.
type Author struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email,omitempty"`
}

// CreatePostData is the request body for creating a post.
type CreatePostData struct {
	Title   string   `json:"title"`
	Content string   `json:"content,omitempty"`
	Status  string   `json:"status,omitempty"`
	Tags    []string `json:"tags,omitempty"`
}

// UpdatePostData is the request body for updating a post.
type UpdatePostData struct {
	Title   string   `json:"title,omitempty"`
	Content string   `json:"content,omitempty"`
	Status  string   `json:"status,omitempty"`
	Tags    []string `json:"tags,omitempty"`
}

// ListOptions controls filtering and pagination for list endpoints.
type ListOptions struct {
	Status string // "draft", "published", "all"
	Limit  int
	Offset int
}

// Client is an HTTP client for the Lattice blog API.
type Client struct {
	baseURL    string
	tenant     string
	token      string
	httpClient *http.Client
}

// NewClient creates a Lattice client for the given tenant.
func NewClient(token, tenant, baseURL string) *Client {
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		tenant:  tenant,
		token:   token,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ListPosts retrieves posts with optional filtering.
func (c *Client) ListPosts(opts ListOptions) ([]Post, error) {
	params := url.Values{}
	if opts.Status != "" && opts.Status != "all" {
		params.Set("status", opts.Status)
	}
	if opts.Limit > 0 {
		params.Set("limit", fmt.Sprintf("%d", opts.Limit))
	}
	if opts.Offset > 0 {
		params.Set("offset", fmt.Sprintf("%d", opts.Offset))
	}

	path := "/posts"
	if len(params) > 0 {
		path += "?" + params.Encode()
	}

	var posts []Post
	if err := c.request("GET", path, nil, &posts); err != nil {
		return nil, err
	}
	return posts, nil
}

// GetPost retrieves a single post by slug.
func (c *Client) GetPost(slug string) (*Post, error) {
	var post Post
	if err := c.request("GET", "/posts/"+slug, nil, &post); err != nil {
		return nil, err
	}
	return &post, nil
}

// CreatePost creates a new blog post.
func (c *Client) CreatePost(data CreatePostData) (*Post, error) {
	var post Post
	if err := c.request("POST", "/posts", data, &post); err != nil {
		return nil, err
	}
	return &post, nil
}

// UpdatePost updates an existing post by slug.
func (c *Client) UpdatePost(slug string, data UpdatePostData) (*Post, error) {
	var post Post
	if err := c.request("PUT", "/posts/"+slug, data, &post); err != nil {
		return nil, err
	}
	return &post, nil
}

// DeletePost deletes a post by slug.
func (c *Client) DeletePost(slug string) error {
	return c.request("DELETE", "/posts/"+slug, nil, nil)
}

// ListDrafts retrieves all draft posts.
func (c *Client) ListDrafts() ([]Post, error) {
	var posts []Post
	if err := c.request("GET", "/drafts", nil, &posts); err != nil {
		return nil, err
	}
	return posts, nil
}

// request makes an authenticated API request to /api/{tenant}{path}.
func (c *Client) request(method, path string, body interface{}, result interface{}) error {
	apiPath := fmt.Sprintf("/api/%s%s", c.tenant, path)
	fullURL := c.baseURL + apiPath

	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal request: %w", err)
		}
		bodyReader = bytes.NewReader(data)
	}

	req, err := http.NewRequest(method, fullURL, bodyReader)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		if len(respBody) > 0 {
			return fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
		}
		return fmt.Errorf("API error %d", resp.StatusCode)
	}

	if result != nil {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("failed to parse response: %w", err)
		}
	}
	return nil
}
